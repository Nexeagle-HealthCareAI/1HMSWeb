import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Stethoscope, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { useDepartmentApi, useDoctorApi } from '@/hooks/useApi';
import { SpecializationSelector } from './SpecializationSelector';
import { QualificationSelector } from './QualificationSelector';
import { CreateDoctorProfileRequest, UpdateDoctorProfileRequest, DoctorProfileResponse } from '../services/doctorProfileApi';

interface DoctorProfileProps {
  isEditing?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
}

interface DoctorProfileData {
  department: string;
  primaryDepartment: string;
  qualifications: string[];
  specializations: string[];
  licenseNumber: string;
  experienceYears: number;
  medicalCouncil: string;
  registrationYear: number;
  bio: string;
}

type FieldErrors = Record<string, string | undefined>;

export const DoctorProfile: React.FC<DoctorProfileProps> = ({ 
  isEditing = false,
  onSave,
  onCancel
}) => {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.userId);
  const hospitalId = useAuthStore((state) => state.hospitalId);
  
  // Fetch departments from API
  const { data: departmentsResponse, isLoading: departmentsLoading, error: departmentsError } = useDepartmentApi.getGlobalDepartments();
  
  // Doctor API hooks
  const createDoctorProfileMutation = useDoctorApi.createDoctorProfile();
  const { data: doctorProfileResponse, isLoading: doctorProfileLoading, error: doctorProfileError } = useDoctorApi.getDoctorProfile(userId || '');
  
  // Track if doctor profile exists
  const [doctorProfileExists, setDoctorProfileExists] = useState<boolean>(false);
  const [doctorId, setDoctorId] = useState<string>('');
  const updateDoctorProfileMutation = useDoctorApi.updateDoctorProfile(doctorId);
  const [saving, setSaving] = useState<boolean>(false);
  const [doctorErrors, setDoctorErrors] = useState<FieldErrors>({});
  
  // Profile data state
  const [profileData, setProfileData] = useState<DoctorProfileData>({
    department: '',
    primaryDepartment: '',
    qualifications: [],
    specializations: [],
    licenseNumber: '',
    experienceYears: 0,
    medicalCouncil: '',
    registrationYear: new Date().getFullYear(),
    bio: ''
  });

  // Extract department names from API response
  const departmentOptions = React.useMemo(() => {
    if (departmentsResponse?.departments) {
      return departmentsResponse.departments
        .filter(dept => dept.isActive)
        .map(dept => dept.name)
        .filter(name => name && name.trim() !== '');
    }
    return [];
  }, [departmentsResponse]);

  // Get department ID from department name
  const getDepartmentId = (departmentName: string): string => {
    const department = departmentsResponse?.departments?.find(dept => dept.name === departmentName);
    return department?.departmentID || '';
  };

  // Validation schema
  const DoctorSchema = z.object({
    licenseNumber: z.string().min(1, 'License number is required'),
    qualifications: z.array(z.string()).min(1, 'At least one qualification is required'),
    experienceYears: z
      .union([z.string(), z.number()])
      .transform((v) => (typeof v === 'string' ? Number(v || 0) : v))
      .refine((v) => Number.isInteger(v) && v >= 0, { message: 'Experience must be a non-negative integer' })
      .optional(),
    medicalCouncil: z.string().max(100, 'Too long').optional(),
    registrationYear: z
      .union([z.string(), z.number()])
      .transform((v) => (v === '' ? undefined : Number(v)))
      .refine((v) => v === undefined || (Number.isInteger(v) && v <= new Date().getFullYear()), {
        message: 'Invalid year',
      })
      .optional(),
    bio: z.string().optional(),
  });

  // Load doctor profile data from React Query response
  useEffect(() => {
    if (doctorProfileResponse && (doctorProfileResponse as DoctorProfileResponse).doctorId) {
      const doctorData = doctorProfileResponse as DoctorProfileResponse;
      
      // Set doctor profile existence and ID
      setDoctorProfileExists(true);
      setDoctorId(doctorData.doctorId);
      
      // Update profile data
      setProfileData({
        licenseNumber: doctorData.licenseNumber || '',
        qualifications: doctorData.qualifications || [],
        experienceYears: doctorData.experienceYears || 0,
        medicalCouncil: doctorData.medicalCouncil || '',
        registrationYear: doctorData.registrationYear || new Date().getFullYear(),
        bio: doctorData.bio || '',
        specializations: doctorData.doctorSpecializations?.map(s => s.specializationName) || [],
        department: doctorData.doctorDepartments?.[0]?.departmentName || '',
        primaryDepartment: doctorData.primaryDepartmentName || ''
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
  const handleInputChange = (field: keyof DoctorProfileData, value: string | number) => {
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
      qualifications
    }));
  };

  // Validate doctor data
  const validateDoctor = (): boolean => {
    const result = DoctorSchema.safeParse({
      licenseNumber: profileData.licenseNumber,
      qualifications: profileData.qualifications,
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
    setSaving(true);
    
    try {
      const departmentId = getDepartmentId(profileData.department);
      if (!departmentId) {
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
        const createData: CreateDoctorProfileRequest = {
          userId: userId || '',
          licenseNumber: profileData.licenseNumber || '',
          qualification: profileData.qualifications || [], // Note: API expects 'qualification' (singular)
          experienceYears: profileData.experienceYears || 0,
          medicalCouncil: profileData.medicalCouncil || '',
          registrationYear: profileData.registrationYear || new Date().getFullYear(),
          bio: profileData.bio || '',
          primaryDepartment: profileData.primaryDepartment || profileData.department,
          department: profileData.department,
          specializations: profileData.specializations,
          hospitalId: hospitalId || ''
        };

        response = await createDoctorProfileMutation.mutateAsync(createData);
        setDoctorProfileExists(true);
        if (response?.doctorId) {
          setDoctorId(response.doctorId);
        }
        toast({ 
          title: 'Success', 
          description: 'Professional profile created successfully.' 
        });
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
        
        const updateData: UpdateDoctorProfileRequest = {
          userId: userId || '',
          licenseNumber: profileData.licenseNumber || '',
          qualification: profileData.qualifications || [], // Note: API expects 'qualification' (singular)
          experienceYears: profileData.experienceYears || 0,
          medicalCouncil: profileData.medicalCouncil || '',
          registrationYear: profileData.registrationYear || new Date().getFullYear(),
          bio: profileData.bio || '',
          primaryDepartment: profileData.primaryDepartment || profileData.department,
          department: profileData.department,
          specializations: profileData.specializations
        };
        
        // Create update mutation with the correct doctorId
              response = await updateDoctorProfileMutation.mutateAsync(updateData);
        toast({ 
          title: 'Success', 
          description: 'Professional details updated successfully.' 
        });
      }
      
      // Clear validation errors on successful save
      setDoctorErrors({});
      
      // Invalidate queries to refresh data
      if (response?.doctorId) {
        queryClient.invalidateQueries({ queryKey: ['doctor', 'profile'] });
        queryClient.invalidateQueries({ queryKey: ['profile', 'completion'] });
      }

      // Call onSave callback if provided
      if (onSave) {
        onSave();
      }
      
    } catch (error: any) {
      console.error('Error saving doctor profile:', error);
      
      // Provide more specific error messages
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
    <Card>
      <CardContent className="p-6">
        <Accordion type="single" collapsible defaultValue="doctor">
          <AccordionItem value="doctor">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4" />
                <span>Doctor Professional</span>
                <span className={`text-xs ml-2 ${Object.keys(doctorErrors).length ? 'text-amber-600' : 'text-green-600'}`}>
                  {Object.keys(doctorErrors).length ? '⚠︎' : '✓'}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={profileData.department || ''}
                    onValueChange={(val) => handleInputChange('department', val)}
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
                        departmentOptions.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
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
                  <SpecializationSelector
                    departmentId={getDepartmentId(profileData.department)}
                    departmentName={profileData.department}
                    selectedSpecializations={profileData.specializations}
                    onSpecializationsChange={handleSpecializationsChange}
                    disabled={!isEditing}
                  />
                </div>
                
                <div className="md:col-span-2">
                  <QualificationSelector
                    selectedQualifications={profileData.qualifications}
                    onQualificationsChange={handleQualificationsChange}
                    disabled={!isEditing}
                  />
                </div>
                
                <div>
                  <Label htmlFor="licenseNumber">Medical License Number *</Label>
                  <Input
                    id="licenseNumber"
                    value={profileData.licenseNumber}
                    onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                  {doctorErrors.licenseNumber && <p className="text-xs text-amber-600 mt-1">{doctorErrors.licenseNumber}</p>}
                </div>
                
                <div>
                  <Label htmlFor="experienceYears">Years of Experience</Label>
                  <Input
                    id="experienceYears"
                    type="number"
                    value={profileData.experienceYears ?? 0}
                    onChange={(e) => handleInputChange('experienceYears', Number(e.target.value))}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="medicalCouncil">Medical Council</Label>
                  <Input
                    id="medicalCouncil"
                    value={profileData.medicalCouncil || ''}
                    onChange={(e) => handleInputChange('medicalCouncil', e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="registrationYear">Registration Year</Label>
                  <Input
                    id="registrationYear"
                    type="number"
                    value={profileData.registrationYear || ''}
                    onChange={(e) => handleInputChange('registrationYear', Number(e.target.value))}
                    disabled={!isEditing}
                    className="mt-1"
                  />
                  {doctorErrors.registrationYear && <p className="text-xs text-amber-600 mt-1">{doctorErrors.registrationYear}</p>}
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileData.bio || ''}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    disabled={!isEditing}
                    className="mt-1"
                    rows={4}
                  />
                </div>
              </div>
              
              {Object.entries(doctorErrors).map(([k, v]) => v && (
                <p key={k} className="text-xs text-amber-600 mt-2">{v}</p>
              ))}
              
              {isEditing && (
                <div className="flex justify-end gap-2 mt-4">
                  {onCancel && (
                    <Button variant="outline" onClick={onCancel}>
                      Cancel
                    </Button>
                  )}
                  <Button 
                    onClick={saveDoctor} 
                    disabled={saving}
                    className="flex items-center gap-2"
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
  );
};
