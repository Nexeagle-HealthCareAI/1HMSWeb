import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { DoctorProfile } from '@/features/doctor/components/DoctorProfile';
import { useUserDetails, useUpdateUserDetails } from '@/hooks/useUserProfileApi';
import { ProfilePictureUploader } from '@/components/shared';
import { UserProfileUpdateRequest, UserDetailsResponse } from '@/features/profile/services/userProfileApi';
import { useMediaUploadApi } from '@/hooks/useApi';
import { 
  User, 
  Building2, 
  Stethoscope, 
  Award, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  ArrowLeft,
  Save,
  Upload,
  Camera,
  Shield,
  Users,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Edit3,
  X
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { ValidationUtils } from '@/utils/validation';

// Gender options
const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' }
];

const genderValues = genderOptions.map((option) => option.value);

// Blood Group options
const bloodGroupOptions = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' }
];

const bloodGroupValues = bloodGroupOptions.map((option) => option.value);

const nameRegex = /^[a-zA-Z\s.'-]+$/;
const cityStateRegex = /^[a-zA-Z\s.'-]+$/;
const addressRegex = /^[a-zA-Z0-9\s,.'#/-]+$/;

const sanitizeOptionalText = (value?: string | null) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

interface ProfilePageProps {
  onBack: () => void;
  userType?: 'AdminDoctor' | 'Admin' | 'Doctor' | 'Staff';
}

interface ProfileData {
  personal: {
    fullName: string;
    email: string;
    phone: string;
    profilePicture?: string;
    dateOfBirth?: string;
    // Extended generic fields
    gender?: string;
    bloodGroup?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
    emergencyContactName?: string;
    emergencyContactNumber?: string;
    employeeId?: string;
  };
  professional: {
    department: string;
    role: string;
    joiningDate: string;
    qualifications: string[];
    specializations: string[];
    licenseNumber?: string;
    // Extended doctor-only fields
    experienceYears?: number;
    medicalCouncil?: string;
    registrationYear?: number;
    bio?: string;
  };
  achievements: {
    totalPatients: number;
    satisfactionRating: number;
    yearsOfService: number;
    certificationsCount: number;
  };
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ 
  onBack, 
  userType = 'Doctor' 
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProfilePictureFile, setSelectedProfilePictureFile] = useState<File | null>(null);
  const [originalProfilePicture, setOriginalProfilePicture] = useState<string>('');
  const [previewUrlToCleanup, setPreviewUrlToCleanup] = useState<string | null>(null);
  const roleFromStore = useAuthStore((state) => state.userRole);
  const effectiveRole = roleFromStore || userType;
  const isDoctorUser = effectiveRole === 'Doctor' || effectiveRole === 'AdminDoctor';
  const employeeIdFromStore = useAuthStore((state) => state.employeeId);
  const userId = useAuthStore((state) => state.userId);
  const { uploadProfilePicture, removeProfilePicture } = useMediaUploadApi;
  
  // Initialize mutations at component level
  const uploadMutation = uploadProfilePicture();
  const removeMutation = removeProfilePicture();
  
  // Profile completion hook
  const { completionPercentage, doctorProfileCompletion } = useProfileCompletion();
  const professionalCompletion = Math.max(0, Math.min(100, Math.round(doctorProfileCompletion ?? 0)));
  
  // User profile API hooks
  const { data: userDetailsResponse, isLoading: userDetailsLoading } = useUserDetails(userId || '');
  const updateUserDetailsMutation = useUpdateUserDetails();


  const [expanded, setExpanded] = useState<string[]>(['personal']);
  const [saving, setSaving] = useState<{ basic?: boolean; address?: boolean; employment?: boolean; doctor?: boolean }>({});
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  type FieldErrors = Record<string, string | undefined>;
  const [basicErrors, setBasicErrors] = useState<FieldErrors>({});
  const [addressErrors, setAddressErrors] = useState<FieldErrors>({});
  const [employmentErrors, setEmploymentErrors] = useState<FieldErrors>({});


  // Validation schemas (Zod)
  const BasicInfoSchema = z.object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name is required')
      .max(80, 'Full name must be under 80 characters')
      .regex(nameRegex, 'Full name can only contain letters and spaces'),
    email: z
      .string()
      .trim()
      .min(1, 'Email is required')
      .max(100, 'Email must be less than 100 characters')
      .email('Please enter a valid email address'),
    phone: z
      .string()
      .trim()
      .min(1, 'Phone number is required')
      .superRefine((value, ctx) => {
        const error = ValidationUtils.validateMobileWithError(value);
        if (error) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
        }
      }),
    gender: z
      .string()
      .optional()
      .refine((value) => !value || genderValues.includes(value), {
        message: 'Please select a valid gender option',
      }),
    dateOfBirth: z
      .string()
      .optional()
      .refine((v) => !v || new Date(v).getTime() <= new Date().setHours(0, 0, 0, 0), {
        message: 'Date of birth cannot be in the future',
      }),
    bloodGroup: z
      .string()
      .optional()
      .refine((value) => !value || bloodGroupValues.includes(value), {
        message: 'Please select a valid blood group',
      }),
  });

  const AddressSchema = z.object({
    addressLine1: z
      .string()
      .trim()
      .min(1, 'Address line 1 is required')
      .max(120, 'Address line 1 must be under 120 characters')
      .regex(addressRegex, 'Address line is required '),
    addressLine2: z
      .string()
      .trim()
      .max(120, 'Address line 2 must be under 120 characters')
      .regex(addressRegex, 'Address line 2 contains invalid characters')
      .optional(),
    city: z
      .string()
      .trim()
      .min(2, 'City is required')
      .max(60, 'City must be under 60 characters')
      .regex(cityStateRegex, 'City can only contain letters and spaces'),
    state: z
      .string()
      .trim()
      .min(2, 'State is required')
      .max(60, 'State must be under 60 characters')
      .regex(cityStateRegex, 'State can only contain letters and spaces'),
    country: z
      .string()
      .trim()
      .min(2, 'Country is required')
      .max(60, 'Country must be under 60 characters')
      .regex(cityStateRegex, 'Country can only contain letters and spaces'),
    pincode: z
      .string()
      .trim()
      .min(6, 'Pincode is required')
      .max(6, 'Pincode must be exactly 6 digits')
      .refine((v) => /^\d{6}$/.test(v), { message: 'Pincode must be exactly 6 digits' }),
    emergencyContactName: z
      .string()
      .trim()
      .min(2, 'Emergency contact name is required')
      .max(60, 'Emergency contact name must be under 60 characters')
      .regex(nameRegex, 'Emergency contact name can only contain letters and spaces')
      .optional(),
    emergencyContactNumber: z
      .string()
      .trim()
      .optional()
      .superRefine((value, ctx) => {
        if (!value) {
          return;
        }
        const error = ValidationUtils.validateMobileWithError(value);
        if (error) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
        }
      }),
  });

  const EmploymentSchema = z.object({
    employeeId: z.string().max(50, 'Employee ID too long').optional(),
  });

  const basicFieldSchemas = {
    email: BasicInfoSchema.shape.email,
    phone: BasicInfoSchema.shape.phone,
  } as const;

  const addressFieldSchemas = {
    emergencyContactNumber: AddressSchema.shape.emergencyContactNumber,
  } as const;


  const [profileData, setProfileData] = useState<ProfileData>({
    personal: {
      fullName: '',
      email: '',
      phone: '',
      profilePicture: '',
      dateOfBirth: '',
      gender: '',
      bloodGroup: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      country: '',
      pincode: '',
      emergencyContactName: '',
      emergencyContactNumber: '',
      employeeId: ''
    },
    professional: {
      department: '',
      role: '',
      joiningDate: '',
      qualifications: [],
      specializations: [],
      licenseNumber: '',
      experienceYears: 0,
      medicalCouncil: '',
      registrationYear: undefined,
      bio: ''
    },
    achievements: {
      totalPatients: 0,
      satisfactionRating: 0,
      yearsOfService: 0,
      certificationsCount: 0
    }
  });

  // Load existing data on component mount
  useEffect(() => {
    if (userDetailsResponse && (userDetailsResponse as UserDetailsResponse).userProfile) {
      const userProfile = (userDetailsResponse as UserDetailsResponse).userProfile;
      const userDetails = userDetailsResponse as UserDetailsResponse;
      const profilePictureURL = userProfile.profilePictureURL || '';
      
      // Store original profile picture
      setOriginalProfilePicture(profilePictureURL);
      
      // Map API data to profile structure
      setProfileData({
        personal: {
          fullName: userProfile.fullName || '',
          email: userDetails.email || '',
          phone: userDetails.mobileNumber || '',
          profilePicture: profilePictureURL,
          dateOfBirth: userProfile.dateOfBirth ? new Date(userProfile.dateOfBirth).toISOString().split('T')[0] : '',
          gender: userProfile.gender || '',
          bloodGroup: userProfile.bloodGroup || '',
          addressLine1: userProfile.addressLine1 || '',
          addressLine2: userProfile.addressLine2 || '',
          city: userProfile.city || '',
          state: userProfile.state || '',
          country: userProfile.country || '',
          pincode: userProfile.pincode || '',
          emergencyContactName: userProfile.emergencyContactName || '',
          emergencyContactNumber: userProfile.emergencyContactNumber || '',
          employeeId: userProfile.employeeID || employeeIdFromStore || ''
        },
        professional: {
          department: '',
          role: effectiveRole,
          joiningDate: new Date().toISOString().split('T')[0],
          qualifications: [],
          specializations: [],
          licenseNumber: '',
          experienceYears: 0,
          medicalCouncil: '',
          registrationYear: undefined,
          bio: ''
        },
        achievements: {
          totalPatients: Math.floor(Math.random() * 500) + 100,
          satisfactionRating: 4.5 + Math.random() * 0.5,
          yearsOfService: 1,
          certificationsCount: Math.floor(Math.random() * 10) + 3
        }
      });
    }
  }, [userDetailsResponse, effectiveRole, employeeIdFromStore]);

  const handleSave = () => {
    // Update localStorage with new profile data
    // TODO: Move setup data to Zustand store
    const setupData = null;
    if (setupData) {
      const data = JSON.parse(setupData);
      data.doctor = {
        ...data.doctor,
        ...profileData.personal,
        ...profileData.professional
      };
      // TODO: Save to Zustand store instead of localStorage
      console.log('Saving profile data:', data);
    }
    
    setIsEditing(false);
    toast({
      title: t('profilePage.toast.updatedTitle'),
      description: t('profilePage.toast.updatedDescription'),
    });
  };

  const handleInputChange = (section: keyof ProfileData, field: string, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));

    if (section === 'personal') {
      if (basicErrors[field]) {
        setBasicErrors((prev) => ({ ...prev, [field]: undefined }));
      }
      if (addressErrors[field]) {
        setAddressErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    }
  };

  const validateBasicField = (field: keyof typeof basicFieldSchemas) => {
    const schema = basicFieldSchemas[field];
    if (!schema) return;
    const result = schema.safeParse(profileData.personal[field] ?? '');
    setBasicErrors((prev) => ({
      ...prev,
      [field]: result.success ? undefined : result.error.issues[0]?.message,
    }));
  };

  const validateAddressField = (field: keyof typeof addressFieldSchemas) => {
    const schema = addressFieldSchemas[field];
    if (!schema) return;
    const rawValue = profileData.personal[field as keyof ProfileData['personal']];
    const normalizedValue = typeof rawValue === 'string' ? sanitizeOptionalText(rawValue) : rawValue;
    const result = schema.safeParse(normalizedValue);
    setAddressErrors((prev) => ({
      ...prev,
      [field]: result.success ? undefined : result.error.issues[0]?.message,
    }));
  };




  
  // Auto-expand Doctor section if focus=doctor or tab=professional
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const focus = params.get('focus') || params.get('tab');
    if ((focus === 'doctor' || focus === 'professional') && isDoctorUser) {
      setExpanded((prev) => Array.from(new Set([...prev, 'doctor'])));
    }
  }, [isDoctorUser]);

  // Section validators and savers
  const validateBasic = (): boolean => {
    const basicPayload = {
      fullName: profileData.personal.fullName?.trim() || '',
      email: profileData.personal.email?.trim() || '',
      phone: profileData.personal.phone?.trim() || '',
      gender: sanitizeOptionalText(profileData.personal.gender),
      dateOfBirth: sanitizeOptionalText(profileData.personal.dateOfBirth),
      bloodGroup: sanitizeOptionalText(profileData.personal.bloodGroup),
    };

    const result = BasicInfoSchema.safeParse(basicPayload);
    const errs: FieldErrors = {};
    if (!result.success) result.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
    setBasicErrors(errs);
    return result.success;
  };

  const validateAddress = (): boolean => {
    const addressPayload = {
      addressLine1: profileData.personal.addressLine1?.trim() || '',
      addressLine2: sanitizeOptionalText(profileData.personal.addressLine2),
      city: profileData.personal.city?.trim() || '',
      state: profileData.personal.state?.trim() || '',
      country: profileData.personal.country?.trim() || '',
      pincode: profileData.personal.pincode?.trim() || '',
      emergencyContactName: sanitizeOptionalText(profileData.personal.emergencyContactName),
      emergencyContactNumber: sanitizeOptionalText(profileData.personal.emergencyContactNumber),
    };

    const result = AddressSchema.safeParse(addressPayload);
    const errs: FieldErrors = {};
    if (!result.success) result.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
    setAddressErrors(errs);
    return result.success;
  };

  const validateEmployment = (): boolean => {
    // Employment section removed; consider valid
    setEmploymentErrors({});
    return true;
  };



  const savePersonalInformation = async () => {
    const basicValid = validateBasic();
    const addressValid = validateAddress();
    if (!basicValid || !addressValid) {
      return;
    }

    setSaving((s) => ({ ...s, basic: true, address: true }));
    try {
      if (!userId) {
          toast({ title: t('profilePage.toast.errorTitle'), description: t('profilePage.toast.missingUser'), variant: 'destructive' });
        return;
      }

      // Upload profile picture first if a file was selected
      let profilePictureURL = profileData.personal.profilePicture || '';
      if (selectedProfilePictureFile) {
        try {
          const uploadResponse = await uploadMutation.mutateAsync({
            userId,
            file: selectedProfilePictureFile,
          });

          if (uploadResponse.success && uploadResponse.profilePictureUrl) {
            profilePictureURL = uploadResponse.profilePictureUrl;
            // Update local state
            setProfileData((prev) => ({
              ...prev,
              personal: {
                ...prev.personal,
                profilePicture: profilePictureURL,
              },
            }));
            setOriginalProfilePicture(profilePictureURL);
          }
        } catch (uploadError) {
          console.error('Error uploading profile picture:', uploadError);
          toast({
            title: t('profilePage.toast.uploadErrorTitle'),
            description: t('profilePage.toast.uploadErrorDescription'),
            variant: 'destructive',
          });
        }
      }

      const normalizedGender = sanitizeOptionalText(profileData.personal.gender) || '';
      const normalizedEmployeeId = sanitizeOptionalText(profileData.personal.employeeId) || '';
      const normalizedBloodGroup = sanitizeOptionalText(profileData.personal.bloodGroup) || '';
      const normalizedAddressLine2 = sanitizeOptionalText(profileData.personal.addressLine2) || '';
      const normalizedDateOfBirth = sanitizeOptionalText(profileData.personal.dateOfBirth);
      const formattedDateOfBirth = normalizedDateOfBirth ? new Date(normalizedDateOfBirth).toISOString() : '';
      const normalizedEmergencyContactName = sanitizeOptionalText(profileData.personal.emergencyContactName) || '';
      const normalizedEmergencyContactNumber = sanitizeOptionalText(profileData.personal.emergencyContactNumber) || '';

      const updateData: UserProfileUpdateRequest = {
        userId,
        mobileNumber: ValidationUtils.cleanMobileNumber(profileData.personal.phone),
        isActive: true,
        fullName: profileData.personal.fullName,
        gender: normalizedGender,
        profilePictureURL,
        employeeID: normalizedEmployeeId,
        dateOfBirth: formattedDateOfBirth,
        bloodGroup: normalizedBloodGroup,
        addressLine1: profileData.personal.addressLine1 || '',
        addressLine2: normalizedAddressLine2,
        city: profileData.personal.city || '',
        state: profileData.personal.state || '',
        country: profileData.personal.country || '',
        pincode: profileData.personal.pincode || '',
        emergencyContactName: normalizedEmergencyContactName,
        emergencyContactNumber: normalizedEmergencyContactNumber,
      };

      await updateUserDetailsMutation.mutateAsync(updateData);

      // Clear selected file and preview URL after successful save
      if (previewUrlToCleanup) {
        URL.revokeObjectURL(previewUrlToCleanup);
        setPreviewUrlToCleanup(null);
      }
      setSelectedProfilePictureFile(null);

      // Refresh profile completion data
      queryClient.invalidateQueries({ queryKey: ['profile', 'completion'] });
      queryClient.invalidateQueries({ queryKey: ['userDetails', userId] });
      setShowCompletionDialog(true);
    } catch (error) {
      console.error('Error saving personal info:', error);
    } finally {
      setSaving((s) => ({ ...s, basic: false, address: false }));
    }
  };

  const saveEmployment = async () => {
    if (!validateEmployment()) return;
    setSaving((s) => ({ ...s, employment: true }));
    try {
      toast({ title: t('profilePage.toast.savedTitle'), description: t('profilePage.toast.employmentSaved') });
    } finally {
      setSaving((s) => ({ ...s, employment: false }));
    }
  };



  // Show loading state while fetching user details
  if (userDetailsLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 lg:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('profilePage.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 lg:p-6 transition-all duration-300">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onBack}
              className="flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('profilePage.header.back')}
            </Button>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{t('profilePage.header.title')}</h1>
              <p className="text-muted-foreground text-sm sm:text-base">{t('profilePage.header.subtitle')}</p>
            </div>
          </div>
          <Button
            onClick={() => {
              if (isEditing) {
                // Cancel editing - revert profile picture to original
                // Clean up preview URL
                if (previewUrlToCleanup) {
                  URL.revokeObjectURL(previewUrlToCleanup);
                  setPreviewUrlToCleanup(null);
                }
                setProfileData(prev => ({
                  ...prev,
                  personal: {
                    ...prev.personal,
                    profilePicture: originalProfilePicture
                  }
                }));
                setSelectedProfilePictureFile(null);
              }
              setIsEditing(!isEditing);
            }}
            variant={isEditing ? "outline" : "default"}
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Edit3 className="h-4 w-4" />
            {isEditing ? t('profilePage.header.cancel') : t('profilePage.header.edit')}
          </Button>
        </div>
      </div>

      {/* Profile Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 items-start">
        {/* Profile Summary Card */}
        <Card className="lg:col-span-1">
          <CardContent className="p-4 sm:p-6 text-center lg:text-left">
            <div className="mb-4 flex flex-col items-center gap-3">
              {isEditing && (
                <Badge variant="secondary" className="mb-2">
                  <Edit3 className="h-3 w-3 mr-1" />
                  {t('profilePage.badges.editing')}
                </Badge>
              )}
              <ProfilePictureUploader
                currentImageUrl={profileData.personal.profilePicture}
                onFileSelect={(file) => {
                  console.log('File selected:', file ? file.name : 'null');
                  // Clean up previous preview URL if it exists
                  if (previewUrlToCleanup) {
                    URL.revokeObjectURL(previewUrlToCleanup);
                  }
                  
                  setSelectedProfilePictureFile(file);
                  // Update preview in local state (just for display)
                  if (file) {
                    const previewUrl = URL.createObjectURL(file);
                    setPreviewUrlToCleanup(previewUrl);
                    setProfileData(prev => ({
                      ...prev,
                      personal: {
                        ...prev.personal,
                        profilePicture: previewUrl
                      }
                    }));
                  } else {
                    // If file is cleared, revert to original
                    setPreviewUrlToCleanup(null);
                    setProfileData(prev => ({
                      ...prev,
                      personal: {
                        ...prev.personal,
                        profilePicture: originalProfilePicture
                      }
                    }));
                  }
                }}
                onRemove={async () => {
                  // Handle remove from server
                  if (!userId) {
                    toast({ title: 'Error', description: 'User ID not found.', variant: 'destructive' });
                    return;
                  }

                  try {
                    const removeResponse = await removeMutation.mutateAsync(userId);

                    if (removeResponse.success) {
                      // Update the profile to remove picture URL
                      const updateData: UserProfileUpdateRequest = {
                        userId,
                        mobileNumber: ValidationUtils.cleanMobileNumber(profileData.personal.phone),
                        isActive: true,
                        fullName: profileData.personal.fullName,
                        gender: profileData.personal.gender || '',
                        profilePictureURL: '',
                        employeeID: profileData.personal.employeeId || '',
                        dateOfBirth: profileData.personal.dateOfBirth ? new Date(profileData.personal.dateOfBirth).toISOString() : '',
                        bloodGroup: profileData.personal.bloodGroup || '',
                        addressLine1: profileData.personal.addressLine1 || '',
                        addressLine2: profileData.personal.addressLine2 || '',
                        city: profileData.personal.city || '',
                        state: profileData.personal.state || '',
                        country: profileData.personal.country || '',
                        pincode: profileData.personal.pincode || '',
                        emergencyContactName: profileData.personal.emergencyContactName || '',
                        emergencyContactNumber: profileData.personal.emergencyContactNumber || ''
                      };

                      await updateUserDetailsMutation.mutateAsync(updateData);
                      
                      // Update local state
                      setProfileData(prev => ({
                        ...prev,
                        personal: {
                          ...prev.personal,
                          profilePicture: ''
                        }
                      }));
                      setOriginalProfilePicture('');
                      
                      // Refresh queries
                      queryClient.invalidateQueries({ queryKey: ['profile', 'completion'] });
                      queryClient.invalidateQueries({ queryKey: ['userDetails', userId] });
                      
                      toast({
                        title: 'Success',
                        description: 'Profile picture removed successfully',
                      });
                      
                      // Exit edit mode after successful removal
                      setIsEditing(false);
                    }
                  } catch (error) {
                    console.error('Error removing profile picture:', error);
                    toast({
                      title: 'Error',
                      description: 'Failed to remove profile picture. Please try again.',
                      variant: 'destructive',
                    });
                  }
                }}
                size="lg"
                disabled={!isEditing}
                autoUpload={false}
              />
              
              {/* Save Profile Picture Button - only show when a file is selected */}
              {selectedProfilePictureFile && isEditing && (
                <Button
                  onClick={async () => {
                    if (!userId) {
                      toast({ title: 'Error', description: 'User ID not found.', variant: 'destructive' });
                      return;
                    }

                    setSaving((s) => ({ ...s, basic: true }));
                    try {
                      const uploadResponse = await uploadMutation.mutateAsync({
                        userId,
                        file: selectedProfilePictureFile,
                      });

                      if (uploadResponse.success && uploadResponse.profilePictureUrl) {
                        const profilePictureURL = uploadResponse.profilePictureUrl;
                        
                        // Update the profile with new picture URL
                        const updateData: UserProfileUpdateRequest = {
                          userId,
                          mobileNumber: ValidationUtils.cleanMobileNumber(profileData.personal.phone),
                          isActive: true,
                          fullName: profileData.personal.fullName,
                          gender: profileData.personal.gender || '',
                          profilePictureURL: profilePictureURL,
                          employeeID: profileData.personal.employeeId || '',
                          dateOfBirth: profileData.personal.dateOfBirth ? new Date(profileData.personal.dateOfBirth).toISOString() : '',
                          bloodGroup: profileData.personal.bloodGroup || '',
                          addressLine1: profileData.personal.addressLine1 || '',
                          addressLine2: profileData.personal.addressLine2 || '',
                          city: profileData.personal.city || '',
                          state: profileData.personal.state || '',
                          country: profileData.personal.country || '',
                          pincode: profileData.personal.pincode || '',
                          emergencyContactName: profileData.personal.emergencyContactName || '',
                          emergencyContactNumber: profileData.personal.emergencyContactNumber || ''
                        };

                        await updateUserDetailsMutation.mutateAsync(updateData);
                        
                        // Update local state
                        setProfileData(prev => ({
                          ...prev,
                          personal: {
                            ...prev.personal,
                            profilePicture: profilePictureURL
                          }
                        }));
                        setOriginalProfilePicture(profilePictureURL);
                        
                        // Clean up
                        if (previewUrlToCleanup) {
                          URL.revokeObjectURL(previewUrlToCleanup);
                          setPreviewUrlToCleanup(null);
                        }
                        setSelectedProfilePictureFile(null);
                        
                        // Refresh queries
                        queryClient.invalidateQueries({ queryKey: ['profile', 'completion'] });
                        queryClient.invalidateQueries({ queryKey: ['userDetails', userId] });
                        
                        toast({
                          title: 'Success',
                          description: 'Profile picture updated successfully',
                        });
                        
                        // Exit edit mode after successful save
                        setIsEditing(false);
                      }
                    } catch (error) {
                      console.error('Error saving profile picture:', error);
                      toast({
                        title: 'Error',
                        description: 'Failed to save profile picture. Please try again.',
                        variant: 'destructive',
                      });
                    } finally {
                      setSaving((s) => ({ ...s, basic: false }));
                    }
                  }}
                  disabled={saving.basic}
                  className="w-full"
                >
                  {saving.basic ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Profile Picture
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="space-y-3 text-left">
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">{t('profilePage.summary.fullName')}</p>
                <p className="font-medium">
                  {profileData.personal.fullName || '—'}
                </p>
              </div>
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">{t('profilePage.summary.phone')}</p>
                <p className="font-medium">
                  {profileData.personal.phone || '—'}
                </p>
              </div>
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">{t('profilePage.summary.employeeId')}</p>
                <p className="font-medium">
                  {employeeIdFromStore || profileData.personal.employeeId || '—'}
                </p>
              </div>
            </div>
          
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="lg:col-span-2">
          <CardContent className="p-4 sm:p-6">
            <Accordion type="multiple" value={expanded} onValueChange={(v) => setExpanded(v as string[])}>
              {/* Doctor Professional at top */}
              {isDoctorUser && (
                <div className="mb-4">
                  <DoctorProfile 
                    isEditing={isEditing}
                    onSave={() => {
                      // Refresh profile completion data
                      queryClient.invalidateQueries({ queryKey: ['profile', 'completion'] });
                      setIsEditing(false);
                    }}
                    onCancel={() => setIsEditing(false)}
                  />
                </div>
              )}

                             {/* Personal Information */}
               <div className="mb-4">
                 <Card className="transition-colors dark:border-border">
                   <CardContent className="p-4 sm:p-6">
                     <Accordion type="single" collapsible defaultValue="personal">
                       <AccordionItem value="personal">
                         <AccordionTrigger className="transition-colors dark:hover:bg-muted/30 hover:no-underline focus:no-underline">
                           <div className="flex flex-wrap items-center gap-2 text-left">
                             <User className="h-4 w-4 text-muted-foreground" />
                                 <span className="text-foreground">{t('profilePage.personal.title')}</span>
                           <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary dark:bg-primary/20 dark:text-primary-100">
                              {t('profilePage.personal.completion', { percent: completionPercentage })}
                            </span>
                             <span className={`text-xs ${Object.keys(basicErrors).length || Object.keys(addressErrors).length ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-300'}`}>
                                   {Object.keys(basicErrors).length || Object.keys(addressErrors).length ? '⚠︎' : '✓'}
                             </span>
                           </div>
                         </AccordionTrigger>
                         <AccordionContent>
                           <div className="space-y-8 mt-4">
                             {/* Basic Info Section */}
                             <div>
                               <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                 <User className="h-4 w-4 text-muted-foreground" />
                                     {t('profilePage.personal.basic.title')}
                               </h4>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                   <Label htmlFor="fullName">
                                         {t('profilePage.personal.basic.fullName.label')} <span className="text-red-500" aria-hidden="true">*</span>
                                   </Label>
                                   <Input
                                     id="fullName"
                                     value={profileData.personal.fullName}
                                     onChange={(e) => handleInputChange('personal', 'fullName', e.target.value)}
                                     disabled={!isEditing}
                                     className="mt-1"
                                   />
                                   {basicErrors.fullName && (
                                     <p className="text-xs text-amber-600 mt-1">{basicErrors.fullName}</p>
                                   )}
                                 </div>
                                 <div>
                                   <Label htmlFor="email">
                                         {t('profilePage.personal.basic.email.label')} <span className="text-red-500" aria-hidden="true">*</span>
                                   </Label>
                                   <Input
                                     id="email"
                                     type="email"
                                     value={profileData.personal.email}
                                     onChange={(e) => handleInputChange('personal', 'email', e.target.value)}
                                       onBlur={() => validateBasicField('email')}
                                     disabled={!isEditing}
                                     className="mt-1"
                                   />
                                   {basicErrors.email && (
                                     <p className="text-xs text-amber-600 mt-1">{basicErrors.email}</p>
                                   )}
                                 </div>
                                 <div>
                                   <Label htmlFor="phone">
                                         {t('profilePage.personal.basic.phone.label')} <span className="text-red-500" aria-hidden="true">*</span>
                                   </Label>
                                   <Input
                                     id="phone"
                                     type="tel"
                                     inputMode="numeric"
                                     pattern="[0-9]*"
                                     value={profileData.personal.phone}
                                     onChange={(e) => handleInputChange('personal', 'phone', e.target.value)}
                                     onBlur={() => validateBasicField('phone')}
                                     disabled={!isEditing}
                                     className="mt-1"
                                   />
                                   {basicErrors.phone && (
                                     <p className="text-xs text-amber-600 mt-1">{basicErrors.phone}</p>
                                   )}
                                 </div>
                                 <div>
                                       <Label htmlFor="dateOfBirth">{t('profilePage.personal.basic.dob.label')}</Label>
                                   <Input
                                     id="dateOfBirth"
                                     type="date"
                                     value={profileData.personal.dateOfBirth}
                                     onChange={(e) => handleInputChange('personal', 'dateOfBirth', e.target.value)}
                                     disabled={!isEditing}
                                     className="mt-1"
                                   />
                                   {basicErrors.dateOfBirth && (
                                     <p className="text-xs text-amber-600 mt-1">{basicErrors.dateOfBirth}</p>
                                   )}
                                 </div>
                                 <div>
                                       <Label htmlFor="gender">{t('profilePage.personal.basic.gender.label')}</Label>
                                   <Select
                                     value={profileData.personal.gender || ''}
                                     onValueChange={(value) => handleInputChange('personal', 'gender', value)}
                                     disabled={!isEditing}
                                   >
                                     <SelectTrigger className="mt-1">
                                       <SelectValue placeholder="Select a gender" />
                                     </SelectTrigger>
                                     <SelectContent>
                                       {genderOptions.map((option) => (
                                         <SelectItem key={option.value} value={option.value}>
                                           {option.label}
                                         </SelectItem>
                                       ))}
                                     </SelectContent>
                                   </Select>
                                   {basicErrors.gender && (
                                     <p className="text-xs text-amber-600 mt-1">{basicErrors.gender}</p>
                                   )}
                                 </div>
                                                                   <div>
                                                                 <Label htmlFor="bloodGroup">{t('profilePage.personal.basic.bloodGroup.label')}</Label>
                                    <Select
                                      value={profileData.personal.bloodGroup || ''}
                                      onValueChange={(value) => handleInputChange('personal', 'bloodGroup', value)}
                                      disabled={!isEditing}
                                    >
                                      <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select a blood group" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {bloodGroupOptions.map((option) => (
                                          <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    {basicErrors.bloodGroup && (
                                      <p className="text-xs text-amber-600 mt-1">{basicErrors.bloodGroup}</p>
                                    )}
                                  </div>
                               </div>
                             </div>

                             {/* Address & Contact Section */}
                             <div>
                               <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                 <MapPin className="h-4 w-4" />
                                     {t('profilePage.personal.address.title')}
                               </h4>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                   <Label htmlFor="address1">
                                     {t('profilePage.personal.address.address1.label')} <span className="text-red-500" aria-hidden="true">*</span>
                                   </Label>
                                   <Input
                                     id="address1"
                                     value={profileData.personal.addressLine1 || ''}
                                     onChange={(e) => handleInputChange('personal', 'addressLine1' as any, e.target.value)}
                                     disabled={!isEditing}
                                     className="mt-1"
                                   />
                                   {addressErrors.addressLine1 && (
                                     <p className="text-xs text-amber-600 mt-1">{addressErrors.addressLine1}</p>
                                   )}
                                 </div>
                                 <div>
                                   <Label htmlFor="address2">Address Line 2</Label>
                                   <Input
                                     id="address2"
                                     value={profileData.personal.addressLine2 || ''}
                                     onChange={(e) => handleInputChange('personal', 'addressLine2' as any, e.target.value)}
                                     disabled={!isEditing}
                                     className="mt-1"
                                   />
                                   {addressErrors.addressLine2 && (
                                     <p className="text-xs text-amber-600 mt-1">{addressErrors.addressLine2}</p>
                                   )}
                                 </div>
                                 <div>
                                   <Label htmlFor="city">
                                     {t('profilePage.personal.address.city.label')} <span className="text-red-500" aria-hidden="true">*</span>
                                   </Label>
                                   <Input 
                                     id="city" 
                                     value={profileData.personal.city || ''} 
                                     onChange={(e) => handleInputChange('personal', 'city' as any, e.target.value)} 
                                     disabled={!isEditing} 
                                     className="mt-1" 
                                   />
                                   {addressErrors.city && (
                                     <p className="text-xs text-amber-600 mt-1">{addressErrors.city}</p>
                                   )}
                                 </div>
                                 <div>
                                   <Label htmlFor="state">
                                     {t('profilePage.personal.address.state.label')} <span className="text-red-500" aria-hidden="true">*</span>
                                   </Label>
                                   <Input 
                                     id="state" 
                                     value={profileData.personal.state || ''} 
                                     onChange={(e) => handleInputChange('personal', 'state' as any, e.target.value)} 
                                     disabled={!isEditing} 
                                     className="mt-1" 
                                   />
                                   {addressErrors.state && (
                                     <p className="text-xs text-amber-600 mt-1">{addressErrors.state}</p>
                                   )}
                                 </div>
                                 <div>
                                   <Label htmlFor="country">
                                     {t('profilePage.personal.address.country.label')} <span className="text-red-500" aria-hidden="true">*</span>
                                   </Label>
                                   <Input 
                                     id="country" 
                                     value={profileData.personal.country || ''} 
                                     onChange={(e) => handleInputChange('personal', 'country' as any, e.target.value)} 
                                     disabled={!isEditing} 
                                     className="mt-1" 
                                   />
                                   {addressErrors.country && (
                                     <p className="text-xs text-amber-600 mt-1">{addressErrors.country}</p>
                                   )}
                                 </div>
                                 <div>
                                   <Label htmlFor="pincode">
                                     {t('profilePage.personal.address.pincode.label')} <span className="text-red-500" aria-hidden="true">*</span>
                                   </Label>
                                   <Input 
                                     id="pincode" 
                                     value={profileData.personal.pincode || ''} 
                                     onChange={(e) => handleInputChange('personal', 'pincode' as any, e.target.value)} 
                                     disabled={!isEditing} 
                                     className="mt-1" 
                                   />
                                   {addressErrors.pincode && (
                                     <p className="text-xs text-amber-600 mt-1">{addressErrors.pincode}</p>
                                   )}
                                 </div>
                               </div>
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                 <div>
                                   <Label htmlFor="emergencyName">
                                     {t('profilePage.personal.address.emergencyName.label')}
                                   </Label>
                                   <Input 
                                     id="emergencyName" 
                                     value={profileData.personal.emergencyContactName || ''} 
                                     onChange={(e) => handleInputChange('personal', 'emergencyContactName' as any, e.target.value)} 
                                     disabled={!isEditing} 
                                     className="mt-1" 
                                   />
                                   {addressErrors.emergencyContactName && (
                                     <p className="text-xs text-amber-600 mt-1">{addressErrors.emergencyContactName}</p>
                                   )}
                                 </div>
                                 <div>
                                   <Label htmlFor="emergencyNumber">
                                     {t('profilePage.personal.address.emergencyNumber.label')}
                                   </Label>
                                   <Input 
                                     id="emergencyNumber" 
                                     type="tel"
                                     inputMode="numeric"
                                     pattern="[0-9]*"
                                     value={profileData.personal.emergencyContactNumber || ''} 
                                     onChange={(e) => handleInputChange('personal', 'emergencyContactNumber' as any, e.target.value)} 
                                     onBlur={() => validateAddressField('emergencyContactNumber')}
                                     disabled={!isEditing} 
                                     className="mt-1" 
                                   />
                                   {addressErrors.emergencyContactNumber && (
                                     <p className="text-xs text-amber-600 mt-1">{addressErrors.emergencyContactNumber}</p>
                                   )}
                                 </div>
                               </div>
                             </div>

                             {/* Save Button */}
                             {isEditing && (
                               <div className="flex flex-col gap-2 pt-4 border-t sm:flex-row sm:justify-end">
                                 <Button 
                                   variant="outline" 
                                   onClick={() => setIsEditing(false)}
                                   className="w-full sm:w-auto"
                                 >
                                     {t('common.cancel')}
                                 </Button>
                                 <Button 
                                   onClick={savePersonalInformation}
                                   disabled={!!saving.basic || !!saving.address}
                                   className="flex items-center justify-center gap-2 w-full sm:w-auto"
                                 >
                                   {saving.basic || saving.address ? (
                                     <>
                                       <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                          {t('common.saving', { defaultValue: 'Saving...' })}
                                     </>
                                   ) : (
                                     <>
                                       <Save className="h-4 w-4" />
                                          {t('profilePage.personal.save')}
                                     </>
                                   )}
                                 </Button>
                               </div>
                             )}
                           </div>
                         </AccordionContent>
                       </AccordionItem>
                     </Accordion>
                   </CardContent>
                 </Card>
               </div>

             

              {/* Doctor Professional (moved to top) removed here to avoid duplicate */}
            </Accordion>


          </CardContent>
        </Card>
      </div>    
      
  
      <AlertDialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Profile updated</AlertDialogTitle>
            <AlertDialogDescription>
              Your profile completion is currently {completionPercentage}%.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowCompletionDialog(false)}>
              OK, Close
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfilePage;


