import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useHospitalApi } from '@/hooks/useApi';
import { hospitalApi } from '../services/hospitalApi';
import { useAuthStore } from '@/store/authStore';
import { useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Save,
  Phone,
  Mail,
  MapPin,
  Globe,
  Clock,
  FileText,
  Hash,
  Type,
  AlertCircle,
  X,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Crown,
  CheckCircle
} from 'lucide-react';
import { HospitalBranding } from './HospitalBrandingConfig';
import { useSubscriptionApi } from '@/features/subscription/hooks/useSubscriptionApi';
import { subscriptionApi, CYCLE_LABEL, type BillingCycle } from '@/features/subscription/services/subscriptionApi';
import { cn } from '@/lib/utils';

interface HospitalBrandingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const defaultBranding: HospitalBranding = {
  name: '',
  type: '',
  email: '',
  contact: '',
  alternateContact: '',
  website: '',
  location: '',
  city: '',
  state: '',
  country: '',
  pincode: '',
  timeZone: '',
  registrationNumber: '',
  gstin: '',
  pan: '',
  nabhNumber: ''
};

// Every field-label/validation/update helper below operates on string values only —
// HospitalBranding's latitude/longitude are numeric and not part of this onboarding form.
type StringFieldKey = Exclude<keyof HospitalBranding, 'latitude' | 'longitude'>;

const requiredFields: ReadonlyArray<StringFieldKey> = [
  'name',
  'type',
  'email',
  'contact',
  'location',
  'city',
  'state',
  'country',
  'pincode',
  'registrationNumber'
];

const RequiredIndicator: React.FC = () => (
  <span className="text-red-500 font-semibold ml-1 align-middle" aria-hidden="true">*</span>
);

export const HospitalBrandingModal: React.FC<HospitalBrandingModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = useAuthStore.getState().getUserId();
  const [branding, setBranding] = useState<HospitalBranding>(defaultBranding);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof HospitalBranding, string>>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [planCycle, setPlanCycle] = useState<BillingCycle>('Monthly');
  const { getPlans } = useSubscriptionApi();
  const { data: onboardingPlans = [] } = getPlans();
  const visibleOnboardingPlans = onboardingPlans.filter(p => p.billingCycle === planCycle);

  const fieldLabels: Record<StringFieldKey, string> = useMemo(
    () => ({
      name: t('hospitalBranding.labels.name'),
      type: t('hospitalBranding.labels.type'),
      email: t('hospitalBranding.labels.email'),
      contact: t('hospitalBranding.labels.contact'),
      alternateContact: t('hospitalBranding.labels.alternateContact'),
      website: t('hospitalBranding.labels.website'),
      location: t('hospitalBranding.labels.location'),
      city: t('hospitalBranding.labels.city'),
      state: t('hospitalBranding.labels.state'),
      country: t('hospitalBranding.labels.country'),
      pincode: t('hospitalBranding.labels.pincode'),
      timeZone: t('hospitalBranding.labels.timeZone'),
      registrationNumber: t('hospitalBranding.labels.registrationNumber'),
      gstin: t('hospitalBranding.labels.gstin'),
      pan: t('hospitalBranding.labels.pan'),
      nabhNumber: t('hospitalBranding.labels.nabhNumber')
    }),
    [t]
  );

  const hospitalTypes = useMemo(
    () => [
      { value: 'Hospital', label: t('hospitalBranding.hospitalTypes.hospital') },
      { value: 'Clinic', label: t('hospitalBranding.hospitalTypes.clinic') },
      { value: 'Medical Center', label: t('hospitalBranding.hospitalTypes.medicalCenter') },
      { value: 'Nursing Home', label: t('hospitalBranding.hospitalTypes.nursingHome') },
      { value: 'Diagnostic Center', label: t('hospitalBranding.hospitalTypes.diagnosticCenter') },
      { value: 'Dental Clinic', label: t('hospitalBranding.hospitalTypes.dentalClinic') },
      { value: 'Eye Clinic', label: t('hospitalBranding.hospitalTypes.eyeClinic') },
      { value: 'Other', label: t('hospitalBranding.hospitalTypes.other') }
    ],
    [t]
  );

  const timeZones = useMemo(
    () => [
      { value: 'Asia/Kolkata', label: t('hospitalBranding.timeZones.asiaKolkata') },
      { value: 'America/New_York', label: t('hospitalBranding.timeZones.americaNewYork') },
      { value: 'America/Los_Angeles', label: t('hospitalBranding.timeZones.americaLosAngeles') },
      { value: 'Europe/London', label: t('hospitalBranding.timeZones.europeLondon') },
      { value: 'Asia/Dubai', label: t('hospitalBranding.timeZones.asiaDubai') },
      { value: 'Asia/Singapore', label: t('hospitalBranding.timeZones.asiaSingapore') }
    ],
    [t]
  );

  const registerHospitalMutation = useHospitalApi.registerHospital();

  // Validation functions
  const isRequiredField = (field: StringFieldKey) => requiredFields.includes(field);

  const validateEmail = (email: string): string | undefined => {
    const trimmed = email.trim();
    if (!trimmed) return t('hospitalBranding.validation.emailRequired');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return t('hospitalBranding.validation.emailInvalid');
    return undefined;
  };

  const validatePhone = (phone: string, isRequired = false): string | undefined => {
    const trimmed = phone.trim();
    if (!trimmed) {
      return isRequired ? t('hospitalBranding.validation.contactRequired') : undefined;
    }

    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(trimmed)) {
      return t('hospitalBranding.validation.phoneInvalid');
    }
    return undefined;
  };

  const validateWebsite = (website: string): string | undefined => {
    const trimmed = website.trim();
    if (trimmed && !trimmed.match(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/)) {
      return t('hospitalBranding.validation.websiteInvalid');
    }
    return undefined;
  };

  const validatePincode = (pincode: string): string | undefined => {
    const trimmed = pincode.trim();
    if (!trimmed) return t('hospitalBranding.validation.required', { field: fieldLabels.pincode });
    if (!/^\d{4,10}$/.test(trimmed)) return t('hospitalBranding.validation.pincodeInvalid');
    return undefined;
  };

  const getFieldError = (field: StringFieldKey, rawValue: string): string | undefined => {
    const value = rawValue ?? '';
    const trimmedValue = value.trim();

    if (isRequiredField(field) && !trimmedValue) {
      return t('hospitalBranding.validation.required', { field: fieldLabels[field] });
    }

    switch (field) {
      case 'email':
        return validateEmail(value);
      case 'contact':
        return validatePhone(value, true);
      case 'alternateContact':
        return validatePhone(value, false);
      case 'website':
        return validateWebsite(value);
      case 'pincode':
        return validatePincode(value);
      case 'gstin':
        if (trimmedValue && !trimmedValue.match(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)) {
          return t('hospitalBranding.validation.gstinInvalid');
        }
        return undefined;
      case 'pan':
        if (trimmedValue && !trimmedValue.match(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)) {
          return t('hospitalBranding.validation.panInvalid');
        }
        return undefined;
      default:
        return undefined;
    }
  };

  const updateBranding = (field: StringFieldKey, value: string) => {
    setBranding(prev => ({
      ...prev,
      [field]: value
    }));

    // Validate the field
    const error = getFieldError(field, value);
    setValidationErrors(prev => {
      const next = { ...prev };
      if (error) {
        next[field] = error;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const validateFields = (fields: ReadonlyArray<StringFieldKey>) => {
    const fieldErrors: Partial<Record<StringFieldKey, string>> = {};

    fields.forEach(field => {
      const value = branding[field] ?? '';
      const error = getFieldError(field, value);
      if (error) {
        fieldErrors[field] = error;
      }
    });

    setValidationErrors(prev => {
      const next = { ...prev };
      fields.forEach(field => {
        if (fieldErrors[field]) {
          next[field] = fieldErrors[field]!;
        } else {
          delete next[field];
        }
      });
      return next;
    });

    return {
      errors: fieldErrors,
      isValid: Object.keys(fieldErrors).length === 0,
    };
  };

  const stepFieldMap: Record<number, ReadonlyArray<StringFieldKey>> = {
    1: ['name', 'type', 'email', 'contact', 'alternateContact', 'website'],
    2: ['location', 'city', 'state', 'country', 'pincode'],
    3: ['registrationNumber', 'gstin', 'pan', 'nabhNumber', 'timeZone'],
  };

  const validateStep = (step: number): boolean => {
    const fields = stepFieldMap[step] ?? [];
    const { isValid } = validateFields(fields);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    } else {
      toast({
        title: t('hospitalBranding.toast.validationTitle'),
        description: t('hospitalBranding.toast.validationDescription'),
        variant: 'destructive'
      });
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSave = async () => {
    if (!userId) {
      toast({
        title: t('hospitalBranding.toast.errorTitle'),
        description: t('hospitalBranding.toast.missingUser'),
        variant: 'destructive'
      });
      return;
    }

    const validationResults = [1, 2, 3].map(step => ({ step, isValid: validateStep(step) }));
    const firstInvalid = validationResults.find(result => !result.isValid);

    if (firstInvalid) {
      setCurrentStep(firstInvalid.step);
      toast({
        title: t('hospitalBranding.toast.validationTitle'),
        description: t('hospitalBranding.toast.validationDescription'),
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await registerHospitalMutation.mutateAsync({
        userId,
        name: branding.name,
        type: branding.type,
        registrationNumber: branding.registrationNumber,
        email: branding.email,
        contact: branding.contact,
        alternateContact: branding.alternateContact || '',
        website: branding.website || '',
        location: branding.location,
        city: branding.city,
        state: branding.state,
        country: branding.country,
        pincode: branding.pincode,
        timeZone: branding.timeZone || 'Asia/Kolkata',
        gstin: branding.gstin,
        pan: branding.pan,
        nabhNumber: branding.nabhNumber
      });

      if (response.success) {
        // Store hospital ID in auth store
        const authStore = useAuthStore.getState();
        authStore.setHospitalId(response.hospitalId);
        // Keep the multi-hospital switcher list in sync with the newly created hospital. Non-blocking.
        hospitalApi.getMyHospitals().then(mine => { if (mine.length) authStore.setHospitals(mine); }).catch(() => { /* non-blocking */ });

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['hospital', response.hospitalId] });
        queryClient.invalidateQueries({ queryKey: ['hospitalUserByUserId'] });

        // Optional: the admin pre-selected a plan on step 4. The 1-month trial is already stamped
        // unconditionally by the registration handler regardless of this — selecting a plan here
        // just marks it for payment later; failing to record it should not undo the registration
        // that already succeeded, so this is a soft, non-blocking follow-up call.
        if (selectedPlanId) {
          try {
            await subscriptionApi.selectPlan({ hospitalId: response.hospitalId, planId: selectedPlanId });
          } catch (planError) {
            console.error('Post-registration plan selection failed', planError);
            toast({
              title: t('hospitalBranding.toast.successTitle'),
              description: 'Hospital created, but we could not save your plan choice — pick it again from the Subscription page.',
            });
          }
        }

        toast({
          title: t('hospitalBranding.toast.successTitle'),
          description: t('hospitalBranding.toast.successDescription')
        });

        onComplete();
      }
    } catch (error: any) {
      console.error('Hospital registration error:', error);
      toast({
        title: t('hospitalBranding.toast.errorTitle'),
        description: error?.response?.data?.message || t('hospitalBranding.toast.errorDescription'),
        variant: 'destructive'
      });
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-4xl max-h-[95vh] p-0 gap-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-b p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">{t('hospitalBranding.modal.headerTitle')}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t('hospitalBranding.modal.headerSubtitle')}</p>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((step) => (
              <React.Fragment key={step}>
                <div className="flex items-center gap-2">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-all ${
                    step < currentStep
                      ? 'bg-primary text-white'
                      : step === currentStep
                        ? 'bg-primary text-white ring-4 ring-primary/20'
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {step < currentStep ? <CheckCircle2 className="h-5 w-5" /> : step}
                  </div>
                  <span className={`text-sm font-medium hidden sm:inline ${
                    step <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step === 1 ? t('hospitalBranding.modal.steps.basicInfo') : step === 2 ? t('hospitalBranding.modal.steps.location') : step === 3 ? t('hospitalBranding.modal.steps.registration') : 'Choose Plan'}
                  </span>
                </div>
                {step < totalSteps && (
                  <div className={`h-1 flex-1 mx-2 rounded transition-all ${
                    step < currentStep ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6 max-h-[calc(95vh-200px)]">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  {t('hospitalBranding.sections.core.title')}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{t('hospitalBranding.sections.core.subtitle')}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    {t('hospitalBranding.labels.name')}
                    <RequiredIndicator />
                  </Label>
                  <Input
                    id="name"
                    value={branding.name}
                    onChange={(e) => updateBranding('name', e.target.value)}
                    placeholder={t('hospitalBranding.placeholders.name')}
                    className={validationErrors.name ? 'border-red-500' : ''}
                  />
                  {validationErrors.name && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="type">
                      {t('hospitalBranding.labels.type')}
                      <RequiredIndicator />
                    </Label>
                  <Select value={branding.type} onValueChange={(value) => updateBranding('type', value)}>
                    <SelectTrigger className={validationErrors.type ? 'border-red-500' : ''}>
                      <SelectValue placeholder={t('hospitalBranding.placeholders.type')} />
                    </SelectTrigger>
                    <SelectContent>
                      {hospitalTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.type && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.type}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {t('hospitalBranding.labels.email')}
                      <RequiredIndicator />
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={branding.email}
                      onChange={(e) => updateBranding('email', e.target.value)}
                      placeholder={t('hospitalBranding.placeholders.email')}
                      className={validationErrors.email ? 'border-red-500' : ''}
                    />
                    {validationErrors.email && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {t('hospitalBranding.labels.contact')}
                      <RequiredIndicator />
                    </Label>
                    <Input
                      id="contact"
                      value={branding.contact}
                      onChange={(e) => updateBranding('contact', e.target.value)}
                      placeholder={t('hospitalBranding.placeholders.contact')}
                      className={validationErrors.contact ? 'border-red-500' : ''}
                    />
                    {validationErrors.contact && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.contact}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="alternateContact">{t('hospitalBranding.labels.alternateContact')}</Label>
                    <Input
                      id="alternateContact"
                      value={branding.alternateContact}
                      onChange={(e) => updateBranding('alternateContact', e.target.value)}
                      placeholder={t('hospitalBranding.placeholders.alternateContact')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {t('hospitalBranding.labels.website')}
                    </Label>
                    <Input
                      id="website"
                      value={branding.website}
                      onChange={(e) => updateBranding('website', e.target.value)}
                      placeholder={t('hospitalBranding.placeholders.website')}
                      className={validationErrors.website ? 'border-red-500' : ''}
                    />
                    {validationErrors.website && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.website}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Location Information */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t('hospitalBranding.sections.location.title')}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{t('hospitalBranding.sections.location.subtitle')}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location">
                    {t('hospitalBranding.labels.location')}
                    <RequiredIndicator />
                  </Label>
                  <Textarea
                    id="location"
                    value={branding.location}
                    onChange={(e) => updateBranding('location', e.target.value)}
                    placeholder={t('hospitalBranding.placeholders.location')}
                    rows={3}
                    className={validationErrors.location ? 'border-red-500' : ''}
                  />
                  {validationErrors.location && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.location}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">
                      {t('hospitalBranding.labels.city')}
                      <RequiredIndicator />
                    </Label>
                    <Input
                      id="city"
                      value={branding.city}
                      onChange={(e) => updateBranding('city', e.target.value)}
                      placeholder={t('hospitalBranding.placeholders.city')}
                      className={validationErrors.city ? 'border-red-500' : ''}
                    />
                    {validationErrors.city && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.city}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">
                      {t('hospitalBranding.labels.state')}
                      <RequiredIndicator />
                    </Label>
                    <Input
                      id="state"
                      value={branding.state}
                      onChange={(e) => updateBranding('state', e.target.value)}
                      placeholder={t('hospitalBranding.placeholders.state')}
                      className={validationErrors.state ? 'border-red-500' : ''}
                    />
                    {validationErrors.state && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.state}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">
                      {t('hospitalBranding.labels.country')}
                      <RequiredIndicator />
                    </Label>
                    <Input
                      id="country"
                      value={branding.country}
                      onChange={(e) => updateBranding('country', e.target.value)}
                      placeholder={t('hospitalBranding.placeholders.country')}
                      className={validationErrors.country ? 'border-red-500' : ''}
                    />
                    {validationErrors.country && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.country}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pincode">
                      {t('hospitalBranding.labels.pincode')}
                      <RequiredIndicator />
                    </Label>
                    <Input
                      id="pincode"
                      value={branding.pincode}
                      onChange={(e) => updateBranding('pincode', e.target.value)}
                      placeholder={t('hospitalBranding.placeholders.pincode')}
                      className={validationErrors.pincode ? 'border-red-500' : ''}
                    />
                    {validationErrors.pincode && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.pincode}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Registration & Configuration */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('hospitalBranding.sections.config.title')}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{t('hospitalBranding.sections.config.subtitle')}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber" className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      {t('hospitalBranding.labels.registrationNumber')}
                      <RequiredIndicator />
                    </Label>
                    <Input
                      id="registrationNumber"
                      value={branding.registrationNumber}
                      onChange={(e) => updateBranding('registrationNumber', e.target.value)}
                      placeholder={t('hospitalBranding.placeholders.registrationNumber')}
                      className={validationErrors.registrationNumber ? 'border-red-500' : ''}
                    />
                    {validationErrors.registrationNumber && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.registrationNumber}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{t('hospitalBranding.helpers.registrationNumber')}</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gstin" className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      {t('hospitalBranding.labels.gstin')}
                    </Label>
                    <Input
                      id="gstin"
                      value={branding.gstin || ''}
                      onChange={(e) => updateBranding('gstin', e.target.value)}
                      placeholder={t('hospitalBranding.placeholders.gstin')}
                      className={validationErrors.gstin ? 'border-red-500' : ''}
                    />
                    {validationErrors.gstin && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.gstin}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pan" className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      {t('hospitalBranding.labels.pan')}
                    </Label>
                    <Input
                      id="pan"
                      value={branding.pan || ''}
                      onChange={(e) => updateBranding('pan', e.target.value)}
                      placeholder={t('hospitalBranding.placeholders.pan')}
                      className={validationErrors.pan ? 'border-red-500' : ''}
                    />
                    {validationErrors.pan && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.pan}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nabhNumber" className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      {t('hospitalBranding.labels.nabhNumber')}
                    </Label>
                    <Input
                      id="nabhNumber"
                      value={branding.nabhNumber || ''}
                      onChange={(e) => updateBranding('nabhNumber', e.target.value)}
                      placeholder={t('hospitalBranding.placeholders.nabhNumber')}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeZone" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {t('hospitalBranding.labels.timeZone')}
                    </Label>
                    <Select value={branding.timeZone || 'Asia/Kolkata'} onValueChange={(value) => updateBranding('timeZone', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('hospitalBranding.placeholders.timeZone')} />
                      </SelectTrigger>
                      <SelectContent>
                        {timeZones.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{t('hospitalBranding.helpers.timeZone')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Choose your plan (optional — the 1-month trial starts regardless) */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5" />
                  Choose your plan
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Optional — you get a 1-month free trial either way. Pick a plan now if you'd like to pay early, or skip and choose one later from the Subscription page.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-1">
                    {(['Monthly', 'Quarterly', 'Yearly'] as BillingCycle[]).map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setPlanCycle(c)}
                        className={cn(
                          'px-5 py-1.5 rounded-full text-sm font-semibold transition-colors',
                          planCycle === c ? 'bg-primary text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'
                        )}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  {selectedPlanId && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedPlanId(null)}>
                      Clear selection
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {visibleOnboardingPlans.map(plan => {
                    const isSelected = plan.id === selectedPlanId;
                    return (
                      <button
                        type="button"
                        key={plan.id}
                        onClick={() => setSelectedPlanId(plan.id)}
                        className={cn(
                          'text-left rounded-xl border-2 p-4 transition-all',
                          isSelected ? 'border-primary shadow-md bg-primary/5' : 'border-border hover:border-primary/40'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-foreground">{plan.name}</p>
                          {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                        </div>
                        <p className="text-2xl font-black text-foreground mt-2">
                          ₹{plan.discountedPrice}
                          <span className="text-sm font-medium text-muted-foreground"> / {CYCLE_LABEL[plan.billingCycle]}</span>
                        </p>
                      </button>
                    );
                  })}
                  {visibleOnboardingPlans.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-full py-6 text-center">No {planCycle.toLowerCase()} plans available right now.</p>
                  )}
                </div>

                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 px-4 py-3">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    {selectedPlanId
                      ? "You'll pay for this after your hospital is created — go to Subscription to mark your payment done."
                      : "Skip this step and start your 1-month trial — you can pick a plan anytime later."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-muted/30 p-4 flex justify-between items-center">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handlePrevious}>
                {t('common.previous')}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {currentStep < totalSteps ? (
              <Button onClick={handleNext}>
                {t('hospitalBranding.modal.nextStep')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button 
                onClick={handleSave}
                disabled={registerHospitalMutation.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {registerHospitalMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('hospitalBranding.buttons.saving')}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('hospitalBranding.modal.saveAndComplete')}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};



