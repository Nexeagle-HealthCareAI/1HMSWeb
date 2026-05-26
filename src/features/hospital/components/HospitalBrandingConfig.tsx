import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  Hash,
  Mail,
  MapPin,
  Phone,
  Save,
  Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useHospitalApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';

export interface HospitalBranding {
  name: string;
  type: string;
  email: string;
  contact: string;
  alternateContact: string;
  website: string;
  location: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  timeZone: string;
  registrationNumber: string;
  gstin?: string;
  pan?: string;
  nabhNumber?: string;
}

interface HospitalBrandingConfigProps {
  branding: HospitalBranding;
  onBrandingChange: (branding: HospitalBranding) => void;
}

const requiredFields: ReadonlyArray<keyof HospitalBranding> = [
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

export const HospitalBrandingConfig: React.FC<HospitalBrandingConfigProps> = ({
  branding,
  onBrandingChange
}) => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { userId, hospitalId, setHospitalId } = useAuthStore();

  const translate = (key: string, fallback: string) => t(key, { defaultValue: fallback });

  const hospitalIdToUse = hospitalId || '';
  const { data: hospitalData, isLoading, error } = useHospitalApi.getHospitalById(hospitalIdToUse);
  const effectiveHospitalId = hospitalId || hospitalData?.hospitalId || '';

  const registerHospitalMutation = useHospitalApi.registerHospital();
  const updateHospitalMutation = useHospitalApi.updateHospital(effectiveHospitalId);

  const [isEditMode, setIsEditMode] = useState(false);
  const [snapshotBeforeEdit, setSnapshotBeforeEdit] = useState<HospitalBranding | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [previousBranding, setPreviousBranding] = useState<HospitalBranding | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const fieldLabels: Record<keyof HospitalBranding, string> = useMemo(
    () => ({
      name: translate('hospitalBranding.labels.name', 'Hospital Name'),
      type: translate('hospitalBranding.labels.type', 'Hospital Type'),
      email: translate('hospitalBranding.labels.email', 'Email'),
      contact: translate('hospitalBranding.labels.contact', 'Primary Contact'),
      alternateContact: translate('hospitalBranding.labels.alternateContact', 'Alternate Contact'),
      website: translate('hospitalBranding.labels.website', 'Website'),
      location: translate('hospitalBranding.labels.location', 'Location'),
      city: translate('hospitalBranding.labels.city', 'City'),
      state: translate('hospitalBranding.labels.state', 'State'),
      country: translate('hospitalBranding.labels.country', 'Country'),
      pincode: translate('hospitalBranding.labels.pincode', 'Pincode'),
      timeZone: translate('hospitalBranding.labels.timeZone', 'Time Zone'),
      registrationNumber: translate('hospitalBranding.labels.registrationNumber', 'Registration Number'),
      gstin: translate('hospitalBranding.labels.gstin', 'GSTIN'),
      pan: translate('hospitalBranding.labels.pan', 'PAN'),
      nabhNumber: translate('hospitalBranding.labels.nabhNumber', 'NABH/NABL No.')
    }),
    [translate, i18n.language]
  );

  // The hospitalTypes array uses translation keys with a fallback to English labels.
  // If you see a key like 'hospitalBranding.hospitalTypes.polyclinic' in the dropdown, check your translation files.
  // The second argument to t() ensures a human-friendly label is always shown.
  const hospitalTypes = useMemo(() => {
    const lang = i18n.language;
    const types = [
      'clinic',
      'polyclinic',
      'nursingHome',
      'generalHospital',
      'multispecialityHospital',
      'superSpecialityHospital',
      'other'
    ] as const;

    const englishFallback: Record<typeof types[number], string> = {
      clinic: 'Clinic',
      polyclinic: 'Polyclinic',
      nursingHome: 'Nursing Home',
      generalHospital: 'General Hospital',
      multispecialityHospital: 'Multispeciality Hospital',
      superSpecialityHospital: 'Super Speciality Hospital',
      other: 'Other'
    };

    const hindiFallback: Record<typeof types[number], string> = {
      clinic: 'क्लिनिक',
      polyclinic: 'पॉलीक्लिनिक',
      nursingHome: 'नर्सिंग होम',
      generalHospital: 'जनरल हॉस्पिटल',
      multispecialityHospital: 'मल्टी स्पेशियलिटी हॉस्पिटल',
      superSpecialityHospital: 'सुपर स्पेशियलिटी हॉस्पिटल',
      other: 'अन्य'
    };

    return types.map((type) => {
      const fallback = lang === 'hi' ? hindiFallback[type] : englishFallback[type];
      const label = t(`hospitalBranding.hospitalTypes.${type}`, {
        defaultValue: fallback
      });
      return { value: type, label };
    });
  }, [t, i18n.language]);

  const timeZones = useMemo(
    () => [
      { value: 'Asia/Kolkata', label: translate('hospitalBranding.timeZones.asiaKolkata', 'Asia/Kolkata') },
      { value: 'Asia/Dubai', label: translate('hospitalBranding.timeZones.asiaDubai', 'Asia/Dubai') },
      { value: 'America/New_York', label: translate('hospitalBranding.timeZones.americaNewYork', 'America/New York') },
      { value: 'America/Los_Angeles', label: translate('hospitalBranding.timeZones.americaLosAngeles', 'America/Los Angeles') },
      { value: 'Europe/London', label: translate('hospitalBranding.timeZones.europeLondon', 'Europe/London') },
      { value: 'Asia/Tokyo', label: translate('hospitalBranding.timeZones.asiaTokyo', 'Asia/Tokyo') },
      { value: 'Australia/Sydney', label: translate('hospitalBranding.timeZones.australiaSydney', 'Australia/Sydney') }
    ],
    [translate, i18n.language]
  );

  const RequiredIndicator: React.FC = () => (
    <span className="text-red-500 font-semibold ml-1" aria-hidden="true">
      *
    </span>
  );

  const validateEmail = (email: string): string | null => {
    const trimmed = email.trim();
    if (!trimmed) return translate('hospitalBranding.validation.emailRequired', 'Email is required');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed) ? null : translate('hospitalBranding.validation.emailInvalid', 'Invalid email address');
  };

  const validatePhone = (phone: string): string | null => {
    const trimmed = phone.trim();
    if (!trimmed) return translate('hospitalBranding.validation.contactRequired', 'Contact number is required');
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    return phoneRegex.test(trimmed) ? null : translate('hospitalBranding.validation.phoneInvalid', 'Invalid phone number');
  };

  const validateWebsite = (website: string): string | null => {
    if (!website) return null;
    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
    return urlRegex.test(website) ? null : translate('hospitalBranding.validation.websiteInvalid', 'Invalid website URL');
  };

  const validatePincode = (pincode: string): string | null => {
    if (!pincode) return null;
    const pincodeRegex = /^[0-9]{4,10}$/;
    return pincodeRegex.test(pincode) ? null : translate('hospitalBranding.validation.pincodeInvalid', 'Invalid pincode');
  };

  const validateGSTIN = (gstin: string): string | null => {
    if (!gstin) return null;
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin) ? null : translate('hospitalBranding.validation.gstinInvalid', 'Invalid GSTIN format');
  };

  const validatePAN = (pan: string): string | null => {
    if (!pan) return null;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan) ? null : translate('hospitalBranding.validation.panInvalid', 'Invalid PAN format');
  };

  const validateField = (field: keyof HospitalBranding, value: string): string | null => {
    const trimmedValue = value?.trim() ?? '';

    if (requiredFields.includes(field) && !trimmedValue) {
      return translate('hospitalBranding.validation.required', `${fieldLabels[field]} is required`);
    }

    switch (field) {
      case 'email':
        return validateEmail(value);
      case 'contact':
        return validatePhone(value);
      case 'alternateContact':
        return trimmedValue ? validatePhone(value) : null;
      case 'website':
        return validateWebsite(value);
      case 'pincode':
        return validatePincode(value);
      case 'gstin':
        return validateGSTIN(value);
      case 'pan':
        return validatePAN(value);
      default:
        return null;
    }
  };

  const validateBranding = (data: HospitalBranding) => {
    const errors: Record<string, string> = {};

    requiredFields.forEach((field) => {
      const error = validateField(field, data[field]);
      if (error) {
        errors[field] = error;
      }
    });

    const optionalChecks: Array<keyof HospitalBranding> = ['alternateContact', 'website', 'timeZone', 'gstin', 'pan', 'nabhNumber'];
    optionalChecks.forEach((field) => {
      const error = validateField(field, data[field] || '');
      if (error) {
        errors[field] = error;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // const hospitalIdToUse = hospitalId || '';
  // const { data: hospitalData, isLoading, error } = useHospitalApi.getHospitalById(hospitalIdToUse);
  const completionPercent = hospitalData?.profileStatus?.profileCompletionPercent ?? 0;
  const completionChecklist = [
    {
      label: translate('hospitalBranding.completion.basicInfo', 'Basic information'),
      complete: hospitalData?.profileStatus?.isBasicInfoComplete ?? false
    },
    {
      label: translate('hospitalBranding.completion.locationInfo', 'Location details'),
      complete: hospitalData?.profileStatus?.isLocationInfoComplete ?? false
    },
    {
      label: translate('hospitalBranding.completion.contactInfo', 'Contact details'),
      complete: hospitalData?.profileStatus?.isContactInfoComplete ?? false
    }
  ];

  useEffect(() => {
    if (hospitalData && hospitalData.hospitalId && hospitalData.name && !isEditMode) {
      const updatedBranding: HospitalBranding = {
        name: hospitalData.name || '',
        type: hospitalData.type || '',
        email: hospitalData.email || '',
        contact: hospitalData.contact || '',
        alternateContact: hospitalData.alternateContact || '',
        website: hospitalData.website || '',
        location: hospitalData.location || '',
        city: hospitalData.city || '',
        state: hospitalData.state || '',
        country: hospitalData.country || '',
        pincode: hospitalData.pincode || '',
        timeZone: hospitalData.timeZone || '',
        registrationNumber: hospitalData.registrationNumber || '',
        gstin: hospitalData.gstin || '',
        pan: hospitalData.pan || '',
        nabhNumber: hospitalData.nabhNumber || ''
      };

      const hasChanges = Object.keys(updatedBranding).some(
        (key) => updatedBranding[key as keyof HospitalBranding] !== previousBranding?.[key as keyof HospitalBranding]
      );

      if (hasChanges) {
        onBrandingChange(updatedBranding);
        setPreviousBranding(updatedBranding);
      }

      setHospitalId(hospitalData.hospitalId);
    }
  }, [hospitalData, onBrandingChange, setHospitalId, isEditMode, previousBranding]);

  const handleSaveBranding = async () => {
    if (!userId) {
      toast({
        title: translate('hospitalBranding.toast.errorTitle', 'Error'),
        description: translate('hospitalBranding.toast.missingUser', 'User information is missing'),
        variant: 'destructive'
      });
      return;
    }

    const isValid = validateBranding(branding);
    if (!isValid) {
      toast({
        title: translate('hospitalBranding.toast.validationTitle', 'Please fix the highlighted fields'),
        description: translate('hospitalBranding.toast.validationDescription', 'Some required fields are missing or invalid.'),
        variant: 'destructive'
      });
      return;
    }

    try {
      if (!hospitalId) {
        const response = await registerHospitalMutation.mutateAsync({
          userId,
          name: branding.name,
          type: branding.type,
          registrationNumber: branding.registrationNumber,
          email: branding.email,
          contact: branding.contact,
          alternateContact: branding.alternateContact,
          website: branding.website,
          location: branding.location,
          city: branding.city,
          state: branding.state,
          country: branding.country,
          pincode: branding.pincode,
          timeZone: branding.timeZone || '',
          gstin: branding.gstin,
          pan: branding.pan,
          nabhNumber: branding.nabhNumber
        });

        if (response.success) {
          onBrandingChange(branding);
          setHospitalId(response.hospitalId);
          queryClient.invalidateQueries({ queryKey: ['hospital', response.hospitalId] });
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#3b82f6', '#10b981', '#f59e0b']
          });
          setShowCompletionModal(true);
        }
      } else {
        const response = await updateHospitalMutation.mutateAsync({
          name: branding.name,
          type: branding.type,
          registrationNumber: branding.registrationNumber,
          email: branding.email,
          contact: branding.contact,
          alternateContact: branding.alternateContact,
          website: branding.website,
          location: branding.location,
          city: branding.city,
          state: branding.state,
          country: branding.country,
          pincode: branding.pincode,
          timeZone: branding.timeZone || '',
          gstin: branding.gstin,
          pan: branding.pan,
          nabhNumber: branding.nabhNumber
        });

        if (response.success) {
          onBrandingChange(branding);
          setIsEditMode(false);
          if (hospitalId) {
            queryClient.invalidateQueries({ queryKey: ['hospital', hospitalId] });
          }
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#3b82f6', '#10b981', '#f59e0b']
          });
          setShowCompletionModal(true);
        }
      }
    } catch (err) {
      console.error('Hospital save error:', err);
    }
  };

  const updateBranding = (field: keyof HospitalBranding, value: string) => {
    onBrandingChange({
      ...branding,
      [field]: value
    });

    const error = validateField(field, value);
    setValidationErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next[field] = error;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const hasMissingRequiredFields = requiredFields.some((field) => !(branding[field]?.trim()));
  const hasValidationErrors = Object.keys(validationErrors).length > 0;
  const isSaveDisabled = hasMissingRequiredFields || hasValidationErrors;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">
              {translate('hospitalBranding.loading.title', 'Loading hospital details...')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-sm text-red-600 mb-4">
              {translate('hospitalBranding.error.title', 'Unable to load hospital details')}
            </p>
            <p className="text-xs text-muted-foreground">
              {translate('hospitalBranding.error.message', 'Please try again in a moment.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isExistingHospital = !!(hospitalId && hospitalData && hospitalData.hospitalId);

  const handleStartEdit = () => {
    setSnapshotBeforeEdit({ ...branding });
    setIsEditMode(true);
    setValidationErrors({});
  };

  const handleCancelEdit = () => {
    if (snapshotBeforeEdit) {
      onBrandingChange(snapshotBeforeEdit);
    }
    setIsEditMode(false);
    setValidationErrors({});
  };

  const handleCompletionContinue = () => {
    setShowCompletionModal(false);
    requestAnimationFrame(() => {
      const event = new CustomEvent('dashboard:navigate', {
        detail: { view: 'dashboard', scrollToTop: true }
      });
      window.dispatchEvent(event);
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {translate('hospitalBranding.title', 'Hospital Branding')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {translate('hospitalBranding.subtitle', 'Add your hospital details')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isExistingHospital && !isEditMode && (
            <Button onClick={handleStartEdit} variant="outline" className="sm:w-auto">
              {translate('hospitalBranding.buttons.editDetails', 'Edit details')}
            </Button>
          )}
          {isExistingHospital && isEditMode && (
            <>
              <Button variant="outline" onClick={handleCancelEdit} className="sm:w-auto">
                {translate('hospitalBranding.buttons.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={handleSaveBranding}
                disabled={updateHospitalMutation.isPending || isSaveDisabled}
                className="sm:w-auto"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateHospitalMutation.isPending
                  ? translate('hospitalBranding.buttons.saving', 'Saving...')
                  : translate('hospitalBranding.buttons.saveChanges', 'Save changes')}
              </Button>
            </>
          )}
          {!isExistingHospital && (
            <Button
              onClick={handleSaveBranding}
              disabled={registerHospitalMutation.isPending || isSaveDisabled}
              className="sm:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {registerHospitalMutation.isPending
                ? translate('hospitalBranding.buttons.saving', 'Saving...')
                : translate('hospitalBranding.buttons.saveInfo', 'Save information')}
            </Button>
          )}
        </div>
      </div>

      <motion.div
        variants={{
          hidden: { opacity: 0 },
          show: { opacity: 1, transition: { staggerChildren: 0.1 } }
        }}
        initial="hidden" animate="show"
        className="grid gap-6"
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Card className="hover:shadow-lg transition-all duration-300 border-border/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t('hospitalBranding.sections.core.title')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t('hospitalBranding.sections.core.subtitle')}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hospitalName" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    {t('hospitalBranding.labels.name')}
                    <RequiredIndicator />
                  </Label>
                  <Input
                    id="hospitalName"
                    value={branding.name}
                    onChange={(e) => updateBranding('name', e.target.value)}
                    placeholder={t('hospitalBranding.placeholders.name')}
                    required
                    disabled={isExistingHospital && !isEditMode}
                    className={validationErrors.name ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  <p className="text-xs text-muted-foreground">{t('hospitalBranding.helpers.name')}</p>
                  {validationErrors.name && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.name}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hospitalType" className="flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    {t('hospitalBranding.labels.type')}
                    <RequiredIndicator />
                  </Label>
                  <Select
                    value={hospitalTypes.some((type) => type.value === branding.type) ? branding.type : undefined}
                    onValueChange={(value) => updateBranding('type', value)}
                    disabled={isExistingHospital && !isEditMode}
                  >
                    <SelectTrigger className={`w-full ${validationErrors.type ? 'border-red-500 focus:border-red-500' : ''}`}>
                      <SelectValue placeholder={t('hospitalBranding.placeholders.type')} />
                    </SelectTrigger>
                    <SelectContent className="max-h-48 overflow-y-auto">
                      {hospitalTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.type && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.type}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Card className="hover:shadow-lg transition-all duration-300 border-border/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                {t('hospitalBranding.sections.contact.title')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t('hospitalBranding.sections.contact.subtitle')}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    required
                    disabled={isExistingHospital && !isEditMode}
                    className={validationErrors.contact ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {validationErrors.contact && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.contact}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{t('hospitalBranding.helpers.primaryContact')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alternateContact" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {t('hospitalBranding.labels.alternateContact')}
                  </Label>
                  <Input
                    id="alternateContact"
                    value={branding.alternateContact}
                    onChange={(e) => updateBranding('alternateContact', e.target.value)}
                    placeholder={t('hospitalBranding.placeholders.alternateContact')}
                    disabled={isExistingHospital && !isEditMode}
                    className={validationErrors.alternateContact ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {validationErrors.alternateContact && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.alternateContact}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{t('hospitalBranding.helpers.alternateContact')}</p>
                </div>
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
                    disabled={isExistingHospital && !isEditMode}
                    className={validationErrors.email ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {validationErrors.email && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.email}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{t('hospitalBranding.helpers.email')}</p>
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
                    disabled={isExistingHospital && !isEditMode}
                    className={validationErrors.website ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {validationErrors.website && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.website}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">{t('hospitalBranding.helpers.website')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Card className="hover:shadow-lg transition-all duration-300 border-border/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {t('hospitalBranding.sections.location.title')}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t('hospitalBranding.sections.location.subtitle')}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {t('hospitalBranding.labels.location')}
                  <RequiredIndicator />
                </Label>
                <Textarea
                  id="location"
                  value={branding.location}
                  onChange={(e) => updateBranding('location', e.target.value)}
                  placeholder={t('hospitalBranding.placeholders.location')}
                  rows={3}
                  required
                  disabled={isExistingHospital && !isEditMode}
                  className={validationErrors.location ? 'border-red-500 focus:border-red-500' : ''}
                />
                <p className="text-xs text-muted-foreground">{t('hospitalBranding.helpers.location')}</p>
                {validationErrors.location && (
                  <div className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.location}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="flex items-center gap-2">
                    {t('hospitalBranding.labels.city')}
                    <RequiredIndicator />
                  </Label>
                  <Input
                    id="city"
                    value={branding.city}
                    onChange={(e) => updateBranding('city', e.target.value)}
                    placeholder={t('hospitalBranding.placeholders.city')}
                    required
                    disabled={isExistingHospital && !isEditMode}
                    className={validationErrors.city ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {validationErrors.city && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.city}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state" className="flex items-center gap-2">
                    {t('hospitalBranding.labels.state')}
                    <RequiredIndicator />
                  </Label>
                  <Input
                    id="state"
                    value={branding.state}
                    onChange={(e) => updateBranding('state', e.target.value)}
                    placeholder={t('hospitalBranding.placeholders.state')}
                    required
                    disabled={isExistingHospital && !isEditMode}
                    className={validationErrors.state ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {validationErrors.state && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.state}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="country" className="flex items-center gap-2">
                    {t('hospitalBranding.labels.country')}
                    <RequiredIndicator />
                  </Label>
                  <Input
                    id="country"
                    value={branding.country}
                    onChange={(e) => updateBranding('country', e.target.value)}
                    placeholder={t('hospitalBranding.placeholders.country')}
                    required
                    disabled={isExistingHospital && !isEditMode}
                    className={validationErrors.country ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {validationErrors.country && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.country}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode" className="flex items-center gap-2">
                    {t('hospitalBranding.labels.pincode')}
                    <RequiredIndicator />
                  </Label>
                  <Input
                    id="pincode"
                    value={branding.pincode}
                    onChange={(e) => updateBranding('pincode', e.target.value)}
                    placeholder={t('hospitalBranding.placeholders.pincode')}
                    required
                    disabled={isExistingHospital && !isEditMode}
                    className={validationErrors.pincode ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {validationErrors.pincode && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.pincode}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Card className="hover:shadow-lg transition-all duration-300 border-border/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur">
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
                    required
                    disabled={isExistingHospital && !isEditMode}
                    className={validationErrors.registrationNumber ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  <p className="text-xs text-muted-foreground">{t('hospitalBranding.helpers.registrationNumber')}</p>
                  {validationErrors.registrationNumber && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.registrationNumber}
                    </div>
                  )}
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
                    disabled={isExistingHospital && !isEditMode}
                    className={validationErrors.gstin ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {validationErrors.gstin && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.gstin}
                    </div>
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
                    disabled={isExistingHospital && !isEditMode}
                    className={validationErrors.pan ? 'border-red-500 focus:border-red-500' : ''}
                  />
                  {validationErrors.pan && (
                    <div className="flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {validationErrors.pan}
                    </div>
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
                    disabled={isExistingHospital && !isEditMode}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeZone" className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {t('hospitalBranding.labels.timeZone')}
                  </Label>
                  <Select
                    value={branding.timeZone}
                    onValueChange={(value) => updateBranding('timeZone', value)}
                    disabled={isExistingHospital && !isEditMode}
                  >
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
        </motion.div>
      </motion.div>

      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <DialogTitle className="text-2xl font-semibold">{t('hospitalBranding.completion.title')}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t('hospitalBranding.completion.description')}
            </DialogDescription>
          </DialogHeader>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
            className="flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-500/20 dark:to-teal-500/10 border border-emerald-200 dark:border-emerald-800 p-6 text-center shadow-inner relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 dark:bg-black/20 backdrop-blur-[2px]" />
            <div className="relative z-10 flex flex-col items-center">
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">{t('hospitalBranding.completion.score')}</p>
              <p className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 mt-2 filter drop-shadow-sm">{completionPercent}%</p>
            </div>
          </motion.div>

          <div className="mt-4 space-y-2">
            {completionChecklist.map((item) => (
              <div key={item.label} className="flex items-center gap-2 rounded-lg border border-border/60 p-2 text-sm">
                {item.complete ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                )}
                <span className="font-medium text-foreground">{item.label}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {item.complete
                    ? t('hospitalBranding.completion.statusComplete')
                    : t('hospitalBranding.completion.statusPending')}
                </span>
              </div>
            ))}
          </div>

          <Button className="mt-6 w-full" onClick={handleCompletionContinue}>
            {t('hospitalBranding.buttons.continue')}
          </Button>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
