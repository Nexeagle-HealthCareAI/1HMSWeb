import React, { useState, useEffect } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { useToast } from '@/hooks/use-toast';
import { useHospitalApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export interface HospitalBranding {
  // Core Info
  name: string;
  type: string;
  
  // Contact
  email: string;
  contact: string;
  alternateContact: string;
  website: string;
  
  // Location
  location: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  
  // Config & Metadata
  timeZone: string;
  registrationNumber: string;

}

interface HospitalBrandingConfigProps {
  branding: HospitalBranding;
  onBrandingChange: (branding: HospitalBranding) => void;
}

const defaultBranding: HospitalBranding = {
  // Core Info
  name: '',
  type: '',
  
  // Contact
  email: '',
  contact: '',
  alternateContact: '',
  website: '',
  
  // Location
  location: '',
  city: '',
  state: '',
  country: '',
  pincode: '',
  
  // Config & Metadata
  timeZone: '',
  registrationNumber: '',

};

const hospitalTypes = [
  { value: 'Clinic', label: 'Clinic', description: 'Small outpatient care unit, usually run by one or more doctors' },
  { value: 'Polyclinic', label: 'Polyclinic', description: 'Multi-specialty outpatient facility without in-patient beds' },
  { value: 'Nursing Home', label: 'Nursing Home', description: 'Small in-patient facility with basic medical care' },
  { value: 'General Hospital', label: 'General Hospital', description: 'Treats a wide range of conditions with in-patient and emergency care' },
  { value: 'Community Hospital', label: 'Community Hospital', description: 'Serves a local area with limited services' },
  { value: 'Multispeciality Hospital', label: 'Multispeciality Hospital', description: 'Offers multiple medical disciplines under one roof' },
  { value: 'Speciality Hospital', label: 'Speciality Hospital', description: 'Hospital specialized in limited disciplines' },
  { value: 'Super Speciality Hospital', label: 'Super Speciality Hospital', description: 'Focused on advanced treatment in one or two specialties' },
  { value: 'Eye Hospital', label: 'Eye Hospital', description: 'Specialized in ophthalmology and eye care' },
  { value: 'Dental Hospital', label: 'Dental Hospital', description: 'Specialized in oral and dental care' },
  { value: 'Orthopedic Hospital', label: 'Orthopedic Hospital', description: 'Specialized in bones, joints, and musculoskeletal care' },
  { value: 'Cardiac Hospital', label: 'Cardiac Hospital', description: 'Specialized in heart care and cardiothoracic surgery' },
  { value: 'Cancer Hospital', label: 'Cancer Hospital', description: 'Oncology-focused care including chemotherapy and radiotherapy' },
  { value: 'Women’s Hospital', label: 'Women’s Hospital', description: 'Specialized in obstetrics, gynecology, and maternity care' },
  { value: 'Children’s Hospital', label: 'Children’s Hospital', description: 'Specialized in pediatric and neonatal care' },
  { value: 'Psychiatric Hospital', label: 'Psychiatric Hospital', description: 'Focused on mental health and behavioral disorders' },
  { value: 'Rehabilitation Hospital', label: 'Rehabilitation Hospital', description: 'Focused on long-term recovery and physiotherapy' },
  { value: 'Infectious Disease Hospital', label: 'Infectious Disease Hospital', description: 'Specialized in TB, HIV, and isolation facilities' },
  { value: 'Neuro Hospital', label: 'Neuro Hospital', description: 'Specialized in neurology and neurosurgery' },
  { value: 'Diagnostic Centre', label: 'Diagnostic Centre', description: 'Specialized in pathology, imaging, and lab tests' },
  { value: 'Radiology Centre', label: 'Radiology Centre', description: 'Specialized in X-ray, MRI, and CT scan services' },
  { value: 'Dialysis Centre', label: 'Dialysis Centre', description: 'Specialized in kidney care and dialysis' },
  { value: 'Blood Bank / Transfusion Centre', label: 'Blood Bank / Transfusion Centre', description: 'Blood storage and transfusion services' },
  { value: 'Emergency Hospital', label: 'Emergency Hospital', description: 'Dedicated to trauma and urgent care' },
  { value: 'Trauma Centre', label: 'Trauma Centre', description: 'Specialized in severe accident and injury cases' },
  { value: 'Ayurvedic Hospital', label: 'Ayurvedic Hospital', description: 'Focused on Ayurveda-based treatment' },
  { value: 'Homeopathic Hospital', label: 'Homeopathic Hospital', description: 'Specialized in homeopathy care' },
  { value: 'Unani / Siddha Hospital', label: 'Unani / Siddha Hospital', description: 'Specialized in Unani or Siddha traditional medicine' },
  { value: 'Naturopathy & Wellness Centre', label: 'Naturopathy & Wellness Centre', description: 'Focused on holistic healing, yoga, and diet therapy' },
  { value: 'Teaching Hospital', label: 'Teaching Hospital', description: 'Attached to a medical college for training doctors' },
  { value: 'Research Hospital', label: 'Research Hospital', description: 'Focused on clinical trials and advanced research' },
];

const timeZones = [
  { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
  { value: 'Asia/Dubai', label: 'Gulf Standard Time (GST)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' }
];

export const HospitalBrandingConfig: React.FC<HospitalBrandingConfigProps> = ({
  branding,
  onBrandingChange
}) => {
  // Temporarily disable toasts
  const toast = (_?: any) => {};
  const queryClient = useQueryClient();
  const { userId, hospitalId, setHospitalId } = useAuthStore();
  const registerHospitalMutation = useHospitalApi.registerHospital();
  const updateHospitalMutation = useHospitalApi.updateHospital(hospitalId || '');
  const [isEditMode, setIsEditMode] = useState(false);
  const [snapshotBeforeEdit, setSnapshotBeforeEdit] = useState<HospitalBranding | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [previousBranding, setPreviousBranding] = useState<HospitalBranding | null>(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Validation functions
  const requiredFields: Array<keyof HospitalBranding> = [
    'name',
    'type',
    'contact',
    'email',
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
    email: 'Email address',
    contact: 'Primary contact',
    alternateContact: 'Alternate contact',
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
    <span className="text-red-500 font-semibold ml-1" aria-hidden="true">*</span>
  );

  const validateEmail = (email: string): string | null => {
    const trimmed = email.trim();
    if (!trimmed) return 'Email address is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed) ? null : 'Please enter a valid email address';
  };

  const validatePhone = (phone: string): string | null => {
    const trimmed = phone.trim();
    if (!trimmed) return 'Primary contact is required';
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    return phoneRegex.test(trimmed) ? null : 'Please enter a valid phone number';
  };

  const validateWebsite = (website: string): string | null => {
    if (!website) return null; // Allow empty website
    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    return urlRegex.test(website) ? null : 'Please enter a valid website URL';
  };

  const validatePincode = (pincode: string): string | null => {
    if (!pincode) return null; // Allow empty pincode
    const pincodeRegex = /^[0-9]{4,10}$/;
    return pincodeRegex.test(pincode) ? null : 'Please enter a valid postal code (4-10 digits)';
  };

  const validateField = (field: keyof HospitalBranding, value: string): string | null => {
    const trimmedValue = value?.trim() ?? '';

    if (requiredFields.includes(field) && !trimmedValue) {
      return `${fieldLabels[field]} is required`;
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
      default:
        return null;
    }
  };

  const validateBranding = (data: HospitalBranding) => {
    const errors: Record<string, string> = {};

    requiredFields.forEach(field => {
      const error = validateField(field, data[field]);
      if (error) {
        errors[field] = error;
      }
    });

    const optionalChecks: Array<keyof HospitalBranding> = ['alternateContact', 'website', 'timeZone'];
    optionalChecks.forEach(field => {
      const error = validateField(field, data[field]);
      if (error) {
        errors[field] = error;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Only fetch when a valid hospitalId is available
  const hospitalIdToUse = hospitalId || '';
  
  // Fetch hospital data
  const { data: hospitalData, isLoading, error } = useHospitalApi.getHospitalById(hospitalIdToUse);
  const completionPercent = hospitalData?.profileStatus?.profileCompletionPercent ?? 0;
  const completionChecklist = [
    {
      label: 'Basic Information',
      complete: hospitalData?.profileStatus?.isBasicInfoComplete ?? false,
    },
    {
      label: 'Location Details',
      complete: hospitalData?.profileStatus?.isLocationInfoComplete ?? false,
    },
    {
      label: 'Contact Information',
      complete: hospitalData?.profileStatus?.isContactInfoComplete ?? false,
    },
  ];

  // Update branding when hospital data is fetched
  useEffect(() => {
    if (hospitalData && hospitalData.hospitalId && hospitalData.name && !isEditMode) {
      const updatedBranding = {
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
      };
      
      // Only update if the data is actually different to prevent unnecessary re-renders
      const hasChanges = Object.keys(updatedBranding).some(key => 
        updatedBranding[key as keyof HospitalBranding] !== previousBranding?.[key as keyof HospitalBranding]
      );
      
      if (hasChanges) {
        onBrandingChange(updatedBranding);
        setPreviousBranding(updatedBranding);
      }
      
      // Store the hospitalId in auth store
      setHospitalId(hospitalData.hospitalId);
    }
  }, [hospitalData, onBrandingChange, setHospitalId, isEditMode]);

  const handleSaveBranding = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found. Please login again.",
        variant: "destructive"
      });
      return;
    }

    const isValid = validateBranding(branding);
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please complete all required fields before saving.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (!hospitalId) {
        // First time: register
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
          timeZone: branding.timeZone
        });

        if (response.success) {
          onBrandingChange(branding);
          setHospitalId(response.hospitalId);
          // Don't exit edit mode for initial save - let user continue editing
          queryClient.invalidateQueries({ queryKey: ['hospital', response.hospitalId] });
          setShowCompletionModal(true);
          // toast removed temporarily
        } else {
          // toast removed temporarily
        }
      } else {
        // Subsequent edits: update
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
          timeZone: branding.timeZone
        });

        if (response.success) {
          onBrandingChange(branding);
          setIsEditMode(false);
          if (hospitalId) {
            queryClient.invalidateQueries({ queryKey: ['hospital', hospitalId] });
          }
          setShowCompletionModal(true);
          // toast removed temporarily
        } else {
          // toast removed temporarily
        }
      }
    } catch (error: any) {
      console.error('Hospital save error:', error);
      // toast removed temporarily
    }
  };

  const updateBranding = (field: keyof HospitalBranding, value: string) => {
    onBrandingChange({
      ...branding,
      [field]: value
    });
    
    // Validate the field and update validation errors
    const error = validateField(field, value);
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

  const hasMissingRequiredFields = requiredFields.some(field => !(branding[field]?.trim()));
  const hasValidationErrors = Object.keys(validationErrors).length > 0;
  const isSaveDisabled = hasMissingRequiredFields || hasValidationErrors;

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading hospital information...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-sm text-red-600 mb-4">Failed to load hospital information</p>
            <p className="text-xs text-muted-foreground">Please try refreshing the page</p>
          </div>
        </div>
      </div>
    );
  }

  // Consider it an existing hospital only if we have loaded hospital data from the server
  // This prevents the fields from being disabled immediately after the first save
  const isExistingHospital = !!(hospitalId && hospitalData && hospitalData.hospitalId);

  const handleStartEdit = () => {
    setSnapshotBeforeEdit({ ...branding });
    setIsEditMode(true);
    setValidationErrors({}); // Clear validation errors when starting edit
  };

  const handleCancelEdit = () => {
    if (snapshotBeforeEdit) {
      onBrandingChange(snapshotBeforeEdit);
    }
    setIsEditMode(false);
    setValidationErrors({}); // Clear validation errors when canceling edit
  };

  const handleCompletionContinue = () => {
    setShowCompletionModal(false);
    requestAnimationFrame(() => {
      const event = new CustomEvent('dashboard:navigate', {
        detail: { view: 'dashboard', scrollToTop: true },
      });
      window.dispatchEvent(event);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Hospital Information</h3>
          <p className="text-sm text-muted-foreground">
            Configure your hospital's complete information and details
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isExistingHospital && !isEditMode && (
            <Button onClick={handleStartEdit} variant="outline" className="sm:w-auto">
              Edit Details
            </Button>
          )}
          {isExistingHospital && isEditMode && (
            <>
              <Button variant="outline" onClick={handleCancelEdit} className="sm:w-auto">
                Cancel
              </Button>
              <Button 
                onClick={handleSaveBranding}
                disabled={updateHospitalMutation.isPending || isSaveDisabled}
                className="sm:w-auto"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateHospitalMutation.isPending ? 'Saving...' : 'Save Changes'}
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
              {registerHospitalMutation.isPending ? 'Saving...' : 'Save Hospital Information'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {/* Core Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Core Information
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Basic hospital details and identity
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hospitalName" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Hospital Name
                  <RequiredIndicator />
                </Label>
                <Input
                  id="hospitalName"
                  value={branding.name}
                  onChange={(e) => updateBranding('name', e.target.value)}
                  placeholder="Enter hospital name"
                  required
                  disabled={isExistingHospital && !isEditMode}
                  className={validationErrors.name ? 'border-red-500 focus:border-red-500' : ''}
                />
                <p className="text-xs text-muted-foreground">Maximum 150 characters</p>
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
                  Hospital Type
                  <RequiredIndicator />
                </Label>
                <Select
                  value={hospitalTypes.some(t=>t.value===branding.type) ? branding.type : undefined}
                  onValueChange={(value) => {
                    updateBranding('type', value)
                  }}
                  disabled={isExistingHospital && !isEditMode}
                >
                  <SelectTrigger className={`w-full ${validationErrors.type ? 'border-red-500 focus:border-red-500' : ''}`}>
                    <SelectValue placeholder="Select hospital type" />
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

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Primary and secondary contact details
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Primary Contact
                  <RequiredIndicator />
                </Label>
                <Input
                  id="contact"
                  value={branding.contact}
                  onChange={(e) => updateBranding('contact', e.target.value)}
                  placeholder="Enter primary phone number"
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
                <p className="text-xs text-muted-foreground">Main contact number</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="alternateContact" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Alternate Contact
                </Label>
                <Input
                  id="alternateContact"
                  value={branding.alternateContact}
                  onChange={(e) => updateBranding('alternateContact', e.target.value)}
                  placeholder="Enter alternate phone number"
                  disabled={isExistingHospital && !isEditMode}
                  className={validationErrors.alternateContact ? 'border-red-500 focus:border-red-500' : ''}
                />
                {validationErrors.alternateContact && (
                  <div className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.alternateContact}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Secondary contact number</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                  <RequiredIndicator />
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={branding.email}
                  onChange={(e) => updateBranding('email', e.target.value)}
                  placeholder="Enter email address"
                  disabled={isExistingHospital && !isEditMode}
                  className={validationErrors.email ? 'border-red-500 focus:border-red-500' : ''}
                />
                {validationErrors.email && (
                  <div className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.email}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Primary email for communications</p>
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
                  placeholder="Enter website URL"
                  disabled={isExistingHospital && !isEditMode}
                  className={validationErrors.website ? 'border-red-500 focus:border-red-500' : ''}
                />
                {validationErrors.website && (
                  <div className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.website}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Hospital's official website</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location Information
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Complete address and location details
            </p>
          </CardHeader>
                     <CardContent className="space-y-4">
             <div className="space-y-2">
               <Label htmlFor="location" className="flex items-center gap-2">
                 <MapPin className="h-4 w-4" />
                 Street Address
                 <RequiredIndicator />
               </Label>
                <Textarea
                 id="location"
                 value={branding.location}
                 onChange={(e) => updateBranding('location', e.target.value)}
                 placeholder="Enter complete street address"
                 rows={3}
                  required
                  disabled={isExistingHospital && !isEditMode}
                  className={validationErrors.location ? 'border-red-500 focus:border-red-500' : ''}
               />
               <p className="text-xs text-muted-foreground">Detailed street address</p>
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
                  City
                  <RequiredIndicator />
                </Label>
                  <Input
                   id="city"
                   value={branding.city}
                   onChange={(e) => updateBranding('city', e.target.value)}
                   placeholder="Enter city name"
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
                  State/Province
                  <RequiredIndicator />
                </Label>
                  <Input
                   id="state"
                   value={branding.state}
                   onChange={(e) => updateBranding('state', e.target.value)}
                   placeholder="Enter state or province"
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
                  Country
                  <RequiredIndicator />
                </Label>
                  <Input
                   id="country"
                   value={branding.country}
                   onChange={(e) => updateBranding('country', e.target.value)}
                   placeholder="Enter country name"
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
                  Postal Code
                  <RequiredIndicator />
                </Label>
                  <Input
                   id="pincode"
                   value={branding.pincode}
                   onChange={(e) => updateBranding('pincode', e.target.value)}
                   placeholder="Enter postal code"
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

        {/* Configuration & Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Configuration & Metadata
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              System configuration and regulatory information
            </p>
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
                  placeholder="Enter hospital registration number"
                  required
                  disabled={isExistingHospital && !isEditMode}
                  className={validationErrors.registrationNumber ? 'border-red-500 focus:border-red-500' : ''}
                />
                <p className="text-xs text-muted-foreground">Official hospital registration number</p>
                {validationErrors.registrationNumber && (
                  <div className="flex items-center gap-1 text-xs text-red-500">
                    <AlertCircle className="h-3 w-3" />
                    {validationErrors.registrationNumber}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeZone" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time Zone
                </Label>
                <Select value={branding.timeZone} onValueChange={(value) => updateBranding('timeZone', value)} disabled={isExistingHospital && !isEditMode}>
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


      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2" />

      <Dialog open={showCompletionModal} onOpenChange={setShowCompletionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center space-y-3">
            <div className="mx-auto h-14 w-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <DialogTitle className="text-2xl font-semibold">Hospital profile complete!</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              All required hospital details are now verified. Admin features are fully unlocked across the platform.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-1 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 p-4 text-center">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-100">Completion score</p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-200">{completionPercent}%</p>
          </div>

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
                  {item.complete ? 'Complete' : 'Pending'}
                </span>
              </div>
            ))}
          </div>

          <Button className="mt-6 w-full" onClick={handleCompletionContinue}>
            Continue
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};