import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useHospitalApi } from '@/hooks/useApi';
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
  ArrowRight
} from 'lucide-react';
import { HospitalBranding } from './HospitalBrandingConfig';

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
  registrationNumber: ''
};

const hospitalTypes = [
  { value: 'Hospital', label: 'Hospital' },
  { value: 'Clinic', label: 'Clinic' },
  { value: 'Medical Center', label: 'Medical Center' },
  { value: 'Nursing Home', label: 'Nursing Home' },
  { value: 'Diagnostic Center', label: 'Diagnostic Center' },
  { value: 'Dental Clinic', label: 'Dental Clinic' },
  { value: 'Eye Clinic', label: 'Eye Clinic' },
  { value: 'Other', label: 'Other' }
];

const timeZones = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' }
];

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

const fieldLabels: Record<keyof HospitalBranding, string> = {
  name: 'Hospital name',
  type: 'Hospital type',
  email: 'Email',
  contact: 'Contact number',
  alternateContact: 'Alternate contact number',
  website: 'Website',
  location: 'Street address',
  city: 'City',
  state: 'State/Province',
  country: 'Country',
  pincode: 'Postal code',
  timeZone: 'Time zone',
  registrationNumber: 'Registration number'
};

const RequiredIndicator: React.FC = () => (
  <span className="text-red-500 font-semibold ml-1 align-middle" aria-hidden="true">*</span>
);

export const HospitalBrandingModal: React.FC<HospitalBrandingModalProps> = ({
  isOpen,
  onClose,
  onComplete
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = useAuthStore.getState().getUserId();
  const [branding, setBranding] = useState<HospitalBranding>(defaultBranding);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof HospitalBranding, string>>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 3;

  const registerHospitalMutation = useHospitalApi.registerHospital();

  // Validation functions
  const isRequiredField = (field: keyof HospitalBranding) => requiredFields.includes(field);

  const validateEmail = (email: string): string | undefined => {
    const trimmed = email.trim();
    if (!trimmed) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) return 'Please enter a valid email address';
    return undefined;
  };

  const validatePhone = (phone: string, isRequired = false): string | undefined => {
    const trimmed = phone.trim();
    if (!trimmed) {
      return isRequired ? 'Phone number is required' : undefined;
    }

    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(trimmed)) {
      return 'Please enter a valid phone number';
    }
    return undefined;
  };

  const validateWebsite = (website: string): string | undefined => {
    const trimmed = website.trim();
    if (trimmed && !trimmed.match(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/)) {
      return 'Please enter a valid website URL';
    }
    return undefined;
  };

  const validatePincode = (pincode: string): string | undefined => {
    const trimmed = pincode.trim();
    if (!trimmed) return 'Postal code is required';
    if (!/^\d{4,10}$/.test(trimmed)) return 'Please enter a valid postal code (4-10 digits)';
    return undefined;
  };

  const getFieldError = (field: keyof HospitalBranding, rawValue: string): string | undefined => {
    const value = rawValue ?? '';
    const trimmedValue = value.trim();

    if (isRequiredField(field) && !trimmedValue) {
      return `${fieldLabels[field]} is required`;
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
      default:
        return undefined;
    }
  };

  const updateBranding = (field: keyof HospitalBranding, value: string) => {
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

  const validateFields = (fields: ReadonlyArray<keyof HospitalBranding>) => {
    const fieldErrors: Partial<Record<keyof HospitalBranding, string>> = {};

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

  const stepFieldMap: Record<number, ReadonlyArray<keyof HospitalBranding>> = {
    1: ['name', 'type', 'email', 'contact', 'alternateContact', 'website'],
    2: ['location', 'city', 'state', 'country', 'pincode'],
    3: ['registrationNumber', 'timeZone'],
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
        title: "Validation Error",
        description: "Please fill in all required fields correctly",
        variant: "destructive"
      });
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSave = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found. Please login again.",
        variant: "destructive"
      });
      return;
    }

    const validationResults = [1, 2, 3].map(step => ({ step, isValid: validateStep(step) }));
    const firstInvalid = validationResults.find(result => !result.isValid);

    if (firstInvalid) {
      setCurrentStep(firstInvalid.step);
      toast({
        title: "Validation Error",
        description: "Please complete all required fields",
        variant: "destructive"
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
        timeZone: branding.timeZone || 'Asia/Kolkata'
      });

      if (response.success) {
        // Store hospital ID in auth store
        const authStore = useAuthStore.getState();
        authStore.setHospitalId(response.hospitalId);
        
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['hospital', response.hospitalId] });
        queryClient.invalidateQueries({ queryKey: ['hospitalUserByUserId'] });

        toast({
          title: "Success!",
          description: "Hospital information saved successfully",
        });

        onComplete();
      }
    } catch (error: any) {
      console.error('Hospital registration error:', error);
      toast({
        title: "Error",
        description: error?.response?.data?.message || "Failed to save hospital information. Please try again.",
        variant: "destructive"
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
                <h2 className="text-2xl font-bold text-foreground">Complete Hospital Information</h2>
                <p className="text-sm text-muted-foreground mt-1">Set up your hospital profile to get started</p>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => (
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
                    {step === 1 ? 'Basic Info' : step === 2 ? 'Location' : 'Registration'}
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
                  Basic Information
                </CardTitle>
                <p className="text-sm text-muted-foreground">Enter your hospital's core details</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Hospital Name
                    <RequiredIndicator />
                  </Label>
                  <Input
                    id="name"
                    value={branding.name}
                    onChange={(e) => updateBranding('name', e.target.value)}
                    placeholder="Enter hospital name"
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
                    Hospital Type
                    <RequiredIndicator />
                  </Label>
                  <Select value={branding.type} onValueChange={(value) => updateBranding('type', value)}>
                    <SelectTrigger className={validationErrors.type ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select hospital type" />
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
                      Email
                      <RequiredIndicator />
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={branding.email}
                      onChange={(e) => updateBranding('email', e.target.value)}
                      placeholder="hospital@example.com"
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
                      Contact Number
                      <RequiredIndicator />
                    </Label>
                    <Input
                      id="contact"
                      value={branding.contact}
                      onChange={(e) => updateBranding('contact', e.target.value)}
                      placeholder="+1 234 567 8900"
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
                    <Label htmlFor="alternateContact">Alternate Contact</Label>
                    <Input
                      id="alternateContact"
                      value={branding.alternateContact}
                      onChange={(e) => updateBranding('alternateContact', e.target.value)}
                      placeholder="Optional alternate number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="website" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Website
                    </Label>
                    <Input
                      id="website"
                      value={branding.website}
                      onChange={(e) => updateBranding('website', e.target.value)}
                      placeholder="https://www.example.com"
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
                  Location Information
                </CardTitle>
                <p className="text-sm text-muted-foreground">Enter your hospital's address details</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location">
                    Street Address
                    <RequiredIndicator />
                  </Label>
                  <Textarea
                    id="location"
                    value={branding.location}
                    onChange={(e) => updateBranding('location', e.target.value)}
                    placeholder="Enter street address"
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
                      City
                      <RequiredIndicator />
                    </Label>
                    <Input
                      id="city"
                      value={branding.city}
                      onChange={(e) => updateBranding('city', e.target.value)}
                      placeholder="Enter city"
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
                      State/Province
                      <RequiredIndicator />
                    </Label>
                    <Input
                      id="state"
                      value={branding.state}
                      onChange={(e) => updateBranding('state', e.target.value)}
                      placeholder="Enter state"
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
                      Country
                      <RequiredIndicator />
                    </Label>
                    <Input
                      id="country"
                      value={branding.country}
                      onChange={(e) => updateBranding('country', e.target.value)}
                      placeholder="Enter country"
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
                      Postal Code
                      <RequiredIndicator />
                    </Label>
                    <Input
                      id="pincode"
                      value={branding.pincode}
                      onChange={(e) => updateBranding('pincode', e.target.value)}
                      placeholder="Enter postal code"
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
                  Registration & Configuration
                </CardTitle>
                <p className="text-sm text-muted-foreground">Enter registration and system configuration details</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber" className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      Registration Number
                      <RequiredIndicator />
                    </Label>
                    <Input
                      id="registrationNumber"
                      value={branding.registrationNumber}
                      onChange={(e) => updateBranding('registrationNumber', e.target.value)}
                      placeholder="Enter registration number"
                      className={validationErrors.registrationNumber ? 'border-red-500' : ''}
                    />
                    {validationErrors.registrationNumber && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.registrationNumber}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">Official hospital registration number</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timeZone" className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Time Zone
                    </Label>
                    <Select value={branding.timeZone || 'Asia/Kolkata'} onValueChange={(value) => updateBranding('timeZone', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select time zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeZones.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Hospital's operating time zone</p>
                  </div>
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
                Previous
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {currentStep < totalSteps ? (
              <Button onClick={handleNext}>
                Next Step
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
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save & Complete
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



