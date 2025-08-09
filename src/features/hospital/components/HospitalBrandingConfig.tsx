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
  Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useHospitalApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/authStore';

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
  name: 'NexEagle Hospital',
  type: 'Multispeciality',
  
  // Contact
  email: 'info@nexeagle.com',
  contact: '+91 98765 43210',
  alternateContact: '+91 98765 43211',
  website: 'www.nexeagle.com',
  
  // Location
  location: '123 Hospital Street, Medical District',
  city: 'Mumbai',
  state: 'Maharashtra',
  country: 'India',
  pincode: '400001',
  
  // Config & Metadata
  timeZone: 'Asia/Kolkata',
  registrationNumber: 'HOSP123456789',

};

const hospitalTypes = [
  { value: 'Clinic', label: 'Clinic' },
  { value: 'Diagnostic', label: 'Diagnostic Center' },
  { value: 'Multispeciality', label: 'Multispeciality Hospital' },
  { value: 'Speciality', label: 'Speciality Hospital' },
  { value: 'General', label: 'General Hospital' },
  { value: 'DayCare', label: 'Day Care Center' },
  { value: 'Rehabilitation', label: 'Rehabilitation Center' }
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { userId, hospitalId, setHospitalId } = useAuthStore();
  const registerHospitalMutation = useHospitalApi.registerHospital();
  const updateHospitalMutation = useHospitalApi.updateHospital(hospitalId || '');
  const [isEditMode, setIsEditMode] = useState(false);
  const [snapshotBeforeEdit, setSnapshotBeforeEdit] = useState<HospitalBranding | null>(null);
  
  // Only fetch when a valid hospitalId is available
  const hospitalIdToUse = hospitalId || '';
  
  // Fetch hospital data
  const { data: hospitalData, isLoading, error } = useHospitalApi.getHospitalById(hospitalIdToUse);

  // Update branding when hospital data is fetched
  useEffect(() => {
    if (hospitalData && hospitalData.hospitalId && hospitalData.name) {
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
      onBrandingChange(updatedBranding);
      
      // Store the hospitalId in auth store
      setHospitalId(hospitalData.hospitalId);
    }
  }, [hospitalData, onBrandingChange, setHospitalId]);

  const handleSaveBranding = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found. Please login again.",
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
          setIsEditMode(false);
          queryClient.invalidateQueries({ queryKey: ['hospital', response.hospitalId] });
          toast({
            title: "Hospital Registration Successful",
            description: response.message || "Hospital has been registered successfully.",
          });
        } else {
          toast({
            title: "Registration Failed",
            description: response.message || "Failed to register hospital. Please try again.",
            variant: "destructive"
          });
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
          toast({
            title: "Hospital Details Updated",
            description: response.message || "Hospital information has been updated.",
          });
        } else {
          toast({
            title: "Update Failed",
            description: response.message || "Failed to update hospital. Please try again.",
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      console.error('Hospital save error:', error);
      toast({
        title: "Save Error",
        description: error?.response?.data?.message || "Failed to save hospital details. Please try again.",
        variant: "destructive"
      });
    }
  };

  const updateBranding = (field: keyof HospitalBranding, value: string) => {
    onBrandingChange({
      ...branding,
      [field]: value
    });
  };

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

  const isExistingHospital = !!hospitalId;

  const handleStartEdit = () => {
    setSnapshotBeforeEdit({ ...branding });
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    if (snapshotBeforeEdit) {
      onBrandingChange(snapshotBeforeEdit);
    }
    setIsEditMode(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
           <h3 className="text-lg font-semibold">Hospital Information</h3>
           <p className="text-sm text-muted-foreground">
             Configure your hospital's complete information and details
           </p>
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
                  Hospital Name *
                </Label>
                <Input
                  id="hospitalName"
                  value={branding.name}
                  onChange={(e) => updateBranding('name', e.target.value)}
                  placeholder="Enter hospital name"
                  required
                  disabled={isExistingHospital && !isEditMode}
                />
                <p className="text-xs text-muted-foreground">Maximum 150 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hospitalType" className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Hospital Type *
                </Label>
                <Select value={branding.type} onValueChange={(value) => updateBranding('type', value)} disabled={isExistingHospital && !isEditMode}>
                  <SelectTrigger>
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
                  Primary Contact *
                </Label>
                <Input
                  id="contact"
                  value={branding.contact}
                  onChange={(e) => updateBranding('contact', e.target.value)}
                  placeholder="Enter primary phone number"
                  required
                  disabled={isExistingHospital && !isEditMode}
                />
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
                />
                <p className="text-xs text-muted-foreground">Secondary contact number</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={branding.email}
                  onChange={(e) => updateBranding('email', e.target.value)}
                  placeholder="Enter email address"
                  disabled={isExistingHospital && !isEditMode}
                />
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
                />
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
                 Street Address *
               </Label>
                <Textarea
                 id="location"
                 value={branding.location}
                 onChange={(e) => updateBranding('location', e.target.value)}
                 placeholder="Enter complete street address"
                 rows={3}
                  required
                  disabled={isExistingHospital && !isEditMode}
               />
               <p className="text-xs text-muted-foreground">Detailed street address</p>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="city">City *</Label>
                  <Input
                   id="city"
                   value={branding.city}
                   onChange={(e) => updateBranding('city', e.target.value)}
                   placeholder="Enter city name"
                    required
                    disabled={isExistingHospital && !isEditMode}
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="state">State/Province *</Label>
                  <Input
                   id="state"
                   value={branding.state}
                   onChange={(e) => updateBranding('state', e.target.value)}
                   placeholder="Enter state or province"
                    required
                    disabled={isExistingHospital && !isEditMode}
                 />
               </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="country">Country *</Label>
                  <Input
                   id="country"
                   value={branding.country}
                   onChange={(e) => updateBranding('country', e.target.value)}
                   placeholder="Enter country name"
                    required
                    disabled={isExistingHospital && !isEditMode}
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="pincode">Postal Code *</Label>
                  <Input
                   id="pincode"
                   value={branding.pincode}
                   onChange={(e) => updateBranding('pincode', e.target.value)}
                   placeholder="Enter postal code"
                    required
                    disabled={isExistingHospital && !isEditMode}
                 />
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
                  Registration Number *
                </Label>
                <Input
                  id="registrationNumber"
                  value={branding.registrationNumber}
                  onChange={(e) => updateBranding('registrationNumber', e.target.value)}
                  placeholder="Enter hospital registration number"
                  required
                  disabled={isExistingHospital && !isEditMode}
                />
                <p className="text-xs text-muted-foreground">Official hospital registration number</p>
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
      <div className="flex justify-end gap-2">
        {!isExistingHospital && (
          <Button 
            onClick={handleSaveBranding}
            disabled={registerHospitalMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {registerHospitalMutation.isPending ? 'Saving...' : 'Save Hospital Information'}
          </Button>
        )}
        {isExistingHospital && !isEditMode && (
          <Button onClick={handleStartEdit}>Edit Details</Button>
        )}
        {isExistingHospital && isEditMode && (
          <>
            <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
            <Button 
              onClick={handleSaveBranding}
              disabled={updateHospitalMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateHospitalMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};