import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Stethoscope, Save, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { useDepartmentApi, useDoctorApi } from '@/hooks/useApi';
import { doctorApi, DoctorProfileResponse } from '@/features/doctor/services/doctorApi';
import type { DoctorProfessionalData } from '@/features/doctor/services/doctorApi';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { SpecializationSelector } from './SpecializationSelector';
import { QualificationSelector } from './QualificationSelector';

interface DoctorProfileProps {
  isEditing?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
}

type FieldErrors = Record<string, string | undefined>;

export const DoctorProfile: React.FC<DoctorProfileProps> = ({ 
  isEditing = false,
  onSave,
  onCancel
}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const userId = useAuthStore((state) => state.userId);
  const hospitalId = useAuthStore((state) => state.hospitalId);
  const setDoctorProfileRestriction = useAuthStore((state) => state.setDoctorProfileRestriction);
  
  // Profile completion hook
  const { doctorProfileCompletion } = useProfileCompletion();
  const clampedProfileCompletion = Math.min(Math.max(Math.round(doctorProfileCompletion ?? 0), 0), 100);
  const isProfileComplete = clampedProfileCompletion >= 100;
  
  // Fetch departments from API
  const { data: departmentsResponse, isLoading: departmentsLoading, error: departmentsError } = useDepartmentApi.getGlobalDepartments();
  
  // Doctor API hooks
  const {
    data: doctorProfileResponse,
    isLoading: doctorProfileLoading,
    error: doctorProfileError,
    refetch: refetchDoctorProfile,
  } = useDoctorApi.getDoctorProfile(userId || '');
  
  // Track if doctor profile exists
  const [doctorProfileExists, setDoctorProfileExists] = useState<boolean>(false);
  const [doctorId, setDoctorId] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [doctorErrors, setDoctorErrors] = useState<FieldErrors>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Profile data state
  const [profileData, setProfileData] = useState<DoctorProfessionalData>({
  userId: userId || '',
  licenseNumber: '',
  qualification: [],
  experienceYears: 0,
  medicalCouncil: '',
  registrationYear: new Date().getFullYear(),
  bio: '',
  primaryDepartment: '',
  department: '',
  specializations: [],
  hospitalId: hospitalId || ''
  });

  useEffect(() => {
    if (hospitalId) {
      setProfileData(prev => {
        if (prev.hospitalId === hospitalId) {
          return prev;
        }
        return { ...prev, hospitalId };
      });
    }
  }, [hospitalId]);

  // Extract department names from API response
  const departmentOptions = useMemo(() => {
    if (!departmentsResponse?.departments) return [];

    return departmentsResponse.departments
      .filter((dept) => dept.isActive && dept.departmentID && dept.name?.trim())
      .map((dept) => ({
        id: String(dept.departmentID),
        name: dept.name,
      }));
  }, [departmentsResponse]);

  const selectedDepartment = departmentOptions.find((dept) => dept.id === profileData.department) || null;
  const selectedDepartmentName = selectedDepartment?.name || profileData.primaryDepartment || '';

  // Validation schema
  const DoctorSchema = z.object({
    licenseNumber: z.string().min(1, 'License number is required'),
    qualifications: z.array(z.string()).min(1, 'Select at least one qualification'),
    specializations: z.array(z.string()).min(1, 'Select at least one specialization'),
    experienceYears: z
      .union([z.string(), z.number()])
      .transform((v) => {
        if (typeof v === 'string') {
          return Number(v);
        }
        return v;
      })
      .refine((v) => Number.isInteger(v) && v >= 0, { message: 'Experience years is required and must be a non-negative number' }),
    medicalCouncil: z.string().min(1, 'Medical council is required').max(100, 'Too long'),
    registrationYear: z
      .union([z.string(), z.number()])
      .transform((v) => {
        if (typeof v === 'string') {
          return Number(v);
        }
        return v;
      })
      .refine(
        (v) => Number.isInteger(v) && v >= 1900 && v <= new Date().getFullYear(),
        { message: 'Registration year is required and must be valid' }
      ),
    bio: z.string().optional(),
  });

  // Load doctor profile data from React Query response
  useEffect(() => {
    if (doctorProfileResponse && (doctorProfileResponse as DoctorProfileResponse).doctorId) {
      const doctorData = doctorProfileResponse as DoctorProfileResponse;
      setDoctorProfileExists(true);
      setDoctorId(doctorData.doctorId);
          setProfileData({
            userId: doctorData.userId || userId || '',
            licenseNumber: doctorData.licenseNumber || '',
            qualification: doctorData.qualifications || [],
            experienceYears: doctorData.experienceYears || 0,
            medicalCouncil: doctorData.medicalCouncil || '',
            registrationYear: doctorData.registrationYear || new Date().getFullYear(),
            bio: doctorData.bio || '',
            primaryDepartment: doctorData.primaryDepartmentName || '',
            department: doctorData.doctorDepartments?.[0]?.departmentId || '',
            specializations: doctorData.doctorSpecializations?.map(s => s.specializationName) || [],
            hospitalId: hospitalId || ''
          });
    } else if (doctorProfileError?.response?.status === 404) {
      // Doctor profile doesn't exist yet
      setDoctorProfileExists(false);
      setDoctorId('');
    } else if (doctorProfileResponse && !(doctorProfileResponse as DoctorProfileResponse).doctorId) {
      setDoctorProfileExists(false);
      setDoctorId('');
    }
  }, [doctorProfileResponse, doctorProfileError, departmentsResponse]);

  // Handle input changes
  const handleInputChange = (field: keyof DoctorProfessionalData, value: string | number) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSpecializationsChange = (specializations: string[]) => {
    setProfileData(prev => ({
      ...prev,
      specializations
    }));
  };

  const handleQualificationsChange = (qualifications: string[]) => {
    setProfileData(prev => ({
      ...prev,
      qualification: qualifications
    }));
  };

  const handleDepartmentChange = (departmentId: string) => {
    const department = departmentOptions.find((dept) => dept.id === departmentId);
    setProfileData(prev => ({
      ...prev,
      department: departmentId,
      primaryDepartment: department?.name || prev.primaryDepartment,
    }));
  };

  // Validate doctor data
  const validateDoctor = (): boolean => {
    const result = DoctorSchema.safeParse({
      licenseNumber: profileData.licenseNumber,
      qualifications: profileData.qualification,
      specializations: profileData.specializations,
      experienceYears: profileData.experienceYears,
      medicalCouncil: profileData.medicalCouncil,
      registrationYear: profileData.registrationYear,
      bio: profileData.bio,
    });
    
    const errs: FieldErrors = {};
    if (!result.success) {
      result.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
    }
    setDoctorErrors(errs);
    return result.success;
  };

  // Save doctor profile
  const saveDoctor = async () => {
    if (!validateDoctor()) return;
    const resolvedHospitalId = hospitalId || profileData.hospitalId;

    if (!resolvedHospitalId) {
      toast({
        title: 'Error',
        description: 'Hospital information is missing. Please refresh and try again.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    
    try {
      // Validate department
      if (!profileData.department) {
        toast({ 
          title: 'Error', 
          description: 'Please select a valid department.',
          variant: 'destructive'
        });
        return;
      }

      let response;

      if (!doctorProfileExists) {
        // Create new doctor profile
        const createData: DoctorProfessionalData = {
          userId: profileData.userId,
          licenseNumber: profileData.licenseNumber,
          qualification: profileData.qualification,
          experienceYears: profileData.experienceYears,
          medicalCouncil: profileData.medicalCouncil,
          registrationYear: profileData.registrationYear,
          bio: profileData.bio,
          primaryDepartment: selectedDepartmentName,
          department: selectedDepartmentName,
          specializations: profileData.specializations,
          hospitalId: resolvedHospitalId
        };

        try {
          const resp = await doctorApi.createDoctorProfile(createData);
          const newDoctorId = resp?.doctorId || (resp as any)?.doctorId;
          if (newDoctorId) {
            setDoctorProfileExists(true);
            setDoctorId(newDoctorId);
            setDoctorProfileRestriction(false, null);
            toast({ title: 'Success', description: 'Doctor profile created successfully.' });
            queryClient.invalidateQueries({ queryKey: ['doctor', 'profile'] });
            queryClient.invalidateQueries({ queryKey: ['profile', 'completion'] });
            try {
              if (userId) {
                await refetchDoctorProfile();
              }
            } catch (refreshError) {
              console.error('Failed to refresh doctor profile after create:', refreshError);
            }
            setShowSuccessModal(true);
            if (onSave) onSave();
          }
        } catch (err) {
          throw err;
        }
      } else {
        // Update existing doctor profile
        if (!doctorId) {
          toast({ 
            title: 'Error', 
            description: 'Unable to update profile. Please refresh the page and try again.',
            variant: 'destructive'
          });
          return;
        }

        const updateData = {
          userId: userId || '',
          hospitalDepartmentMappingId: profileData.department,
          licenseNumber: profileData.licenseNumber,
          qualification: profileData.qualification,
          experienceYears: profileData.experienceYears,
          medicalCouncil: profileData.medicalCouncil,
          registrationYear: profileData.registrationYear,
          bio: profileData.bio,
          primaryDepartment: selectedDepartmentName,
          department: selectedDepartmentName,
          specializations: profileData.specializations
        };

        try {
          const resp = await doctorApi.updateDoctorProfessional(updateData);
          const updatedDoctorId = resp?.doctorId || (resp as any)?.doctorId || doctorId;
          setDoctorProfileRestriction(false, null);
          toast({ title: 'Success', description: 'Doctor profile updated successfully.' });
          queryClient.invalidateQueries({ queryKey: ['doctor', 'profile', updatedDoctorId] });
          queryClient.invalidateQueries({ queryKey: ['profile', 'completion'] });
          try {
            if (userId) {
              await refetchDoctorProfile();
            }
          } catch (refreshError) {
            console.error('Failed to refresh doctor profile after update:', refreshError);
          }
          setShowSuccessModal(true);
          if (onSave) onSave();
        } catch (err) {
          throw err;
        }
      }

      setDoctorErrors({});

      if (response?.doctorId) {
        queryClient.invalidateQueries({ queryKey: ['doctor', 'profile'] });
        queryClient.invalidateQueries({ queryKey: ['profile', 'completion'] });
      }

      if (onSave) {
        onSave();
      }

    } catch (error: any) {
      console.error('Error saving doctor profile:', error);
      let errorMessage = 'Failed to save professional details. Please try again.';
      if (error?.response?.status === 400) {
        errorMessage = 'Invalid data provided. Please check your information and try again.';
      } else if (error?.response?.status === 409) {
        errorMessage = 'A profile with this license number already exists.';
      } else if (error?.response?.status === 404) {
        errorMessage = 'Profile not found. Please refresh the page and try again.';
      }
      toast({ 
        title: 'Error', 
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className={`transition-colors ${isProfileComplete ? 'border-green-200 bg-green-50/30 dark:border-green-700/60 dark:bg-green-950/30' : 'dark:border-border'}`}>
        <CardContent className="p-4 sm:p-6">
        
        <Accordion type="single" collapsible defaultValue="doctor">
          <AccordionItem value="doctor">
            <AccordionTrigger className={`${isProfileComplete ? 'hover:bg-green-100/50 dark:hover:bg-green-900/30' : ''} transition-colors hover:no-underline focus:no-underline`}>
              <div className="flex flex-wrap items-center gap-2 text-left">
                <Stethoscope className={`h-4 w-4 ${isProfileComplete ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                <span className={`${isProfileComplete ? 'text-green-800 font-medium dark:text-green-200' : 'text-foreground'}`}>Doctor Professional</span>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary dark:bg-primary/20 dark:text-primary-100">
                  Professional completion {clampedProfileCompletion}%
                </span>
                {isProfileComplete ? (
                  <div className="flex items-center gap-1 sm:ml-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-300" />
                    <span className="text-xs text-green-600 font-medium dark:text-green-200">Complete</span>
                  </div>
                ) : (
                  <span className={`text-xs ${Object.keys(doctorErrors).length ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-300'}`}>
                    {Object.keys(doctorErrors).length ? '⚠︎' : '✓'}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="department" className="flex items-center gap-1">
                    Department
                    <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={profileData.department || ''}
                    onValueChange={handleDepartmentChange}
                    disabled={!isEditing || departmentsLoading}
                  >
                    <SelectTrigger id="department" className="mt-1">
                      <SelectValue placeholder={departmentsLoading ? "Loading departments..." : "Select department"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-56 overflow-y-auto">
                      {departmentsLoading ? (
                        <SelectItem value="loading" disabled>Loading departments...</SelectItem>
                      ) : departmentsError ? (
                        <SelectItem value="error" disabled>Error loading departments</SelectItem>
                      ) : departmentOptions.length === 0 ? (
                        <SelectItem value="no-data" disabled>No departments available</SelectItem>
                      ) : (
                        departmentOptions.map(({ id, name }) => (
                          <SelectItem key={id} value={id}>{name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {departmentsError && (
                    <p className="text-xs text-red-600 mt-1">
                      Failed to load departments. Please try again later.
                    </p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <Label className="flex items-center gap-1 text-sm font-medium">
                    Specializations
                    <span className="text-red-500">*</span>
                  </Label>
                  <SpecializationSelector
                    departmentId={profileData.department}
                    departmentName={selectedDepartment?.name || ''}
                    selectedSpecializations={profileData.specializations}
                    onSpecializationsChange={handleSpecializationsChange}
                    disabled={!isEditing}
                  />
                  {doctorErrors.specializations && (
                    <p className="text-xs text-red-600 mt-1">{doctorErrors.specializations}</p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <Label className="flex items-center gap-1 text-sm font-medium">
                    Qualifications
                    <span className="text-red-500">*</span>
                  </Label>
                  <QualificationSelector
                    selectedQualifications={profileData.qualification}
                    onQualificationsChange={handleQualificationsChange}
                    disabled={!isEditing}
                  />
                  {doctorErrors.qualifications && (
                    <p className="text-xs text-red-600 mt-1">{doctorErrors.qualifications}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="licenseNumber" className="flex items-center gap-1">
                    Medical License Number
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="licenseNumber"
                    value={profileData.licenseNumber}
                    onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                  {doctorErrors.licenseNumber && <p className="text-xs text-red-600 mt-1">{doctorErrors.licenseNumber}</p>}
                </div>
                
                <div>
                  <Label htmlFor="experienceYears" className="flex items-center gap-1">
                    Years of Experience
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="experienceYears"
                    type="number"
                    value={profileData.experienceYears ?? 0}
                    onChange={(e) => handleInputChange('experienceYears', Number(e.target.value))}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                  {doctorErrors.experienceYears && (
                    <p className="text-xs text-red-600 mt-1">{doctorErrors.experienceYears}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="medicalCouncil" className="flex items-center gap-1">
                    Medical Council
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="medicalCouncil"
                    value={profileData.medicalCouncil || ''}
                    onChange={(e) => handleInputChange('medicalCouncil', e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                  {doctorErrors.medicalCouncil && (
                    <p className="text-xs text-red-600 mt-1">{doctorErrors.medicalCouncil}</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="registrationYear" className="flex items-center gap-1">
                    Registration Year
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="registrationYear"
                    type="number"
                    value={profileData.registrationYear || ''}
                    onChange={(e) => handleInputChange('registrationYear', Number(e.target.value))}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                  {doctorErrors.registrationYear && <p className="text-xs text-red-600 mt-1">{doctorErrors.registrationYear}</p>}
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <div className="space-y-2">
                    <Textarea
                      id="bio"
                      value={profileData.bio || ''}
                      onChange={(e) => handleInputChange('bio', e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                      rows={4}
                      placeholder="Write a brief professional bio about your medical expertise, specializations, and approach to patient care. Aim for around 50 words for better profile visibility."
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>💡 Tip: Write around 50 words to improve your profile visibility and help patients understand your expertise better.</span>
                      <span className={`${profileData.bio ? (profileData.bio.split(' ').length < 30 ? 'text-amber-600' : profileData.bio.split(' ').length > 70 ? 'text-red-600' : 'text-green-600') : 'text-muted-foreground'}`}>
                        {profileData.bio ? `${profileData.bio.split(' ').length} words` : '0 words'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {Object.entries(doctorErrors).map(([k, v]) => v && (
                <p key={k} className="text-xs text-red-600 mt-2">{v}</p>
              ))}
              
              {isEditing && (
                <div className="flex flex-col gap-2 mt-4 sm:flex-row sm:justify-end">
                  {onCancel && (
                    <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
                      Cancel
                    </Button>
                  )}
                  <Button 
                    onClick={saveDoctor} 
                    disabled={saving}
                    className="flex items-center justify-center gap-2 w-full sm:w-auto"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        Save Professional
                      </>
                      )}
                  </Button>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
      </Card>

      <AlertDialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Professional details updated</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>Your profile is now synced with the latest information. What would you like to do next?</p>
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/60">
                <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                  <span>Profile completion</span>
                  <span className="text-blue-600">{clampedProfileCompletion}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${clampedProfileCompletion}%` }}
                    aria-label={`Profile completion ${clampedProfileCompletion}%`}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {clampedProfileCompletion === 100
                    ? 'Amazing! Your professional profile is fully complete.'
                    : 'Complete the remaining fields to unlock the full experience.'}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowSuccessModal(false)}>
              Continue editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowSuccessModal(false);
                navigate('/dashboard');
              }}
            >
              Go to dashboard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
