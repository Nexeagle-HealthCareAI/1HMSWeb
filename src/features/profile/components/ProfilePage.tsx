import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfilePhotoUploader } from './ProfilePhotoUploader';
import { 
  User, 
  Building2, 
  Stethoscope, 
  Award, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Star,
  Trophy,
  Target,
  Zap,
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
  Edit3
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

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
    language?: string;
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
    qualification?: string;
    specialization?: string;
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
  const [activeTab, setActiveTab] = useState('personal');
  const [isEditing, setIsEditing] = useState(false);
  const roleFromStore = useAuthStore((state) => state.userRole);
  const effectiveRole = roleFromStore || userType;
  const isDoctorUser = effectiveRole === 'Doctor' || effectiveRole === 'AdminDoctor';
  const employeeIdFromStore = useAuthStore((state) => state.employeeId);
  const departmentOptions = [
    'Cardiology',
    'Pediatrics',
    'Neurology',
    'Orthopedics',
    'General Medicine',
    'General Surgery',
    'Gynecology',
    'Dermatology',
    'ENT',
    'Ophthalmology',
    'Oncology',
    'Radiology',
    'Pathology',
    'Emergency',
  ];
  const [expanded, setExpanded] = useState<string[]>(['basic', 'address']);
  const [saving, setSaving] = useState<{ basic?: boolean; address?: boolean; employment?: boolean; doctor?: boolean }>({});
  type FieldErrors = Record<string, string | undefined>;
  const [basicErrors, setBasicErrors] = useState<FieldErrors>({});
  const [addressErrors, setAddressErrors] = useState<FieldErrors>({});
  const [employmentErrors, setEmploymentErrors] = useState<FieldErrors>({});
  const [doctorErrors, setDoctorErrors] = useState<FieldErrors>({});

  // Validation schemas (Zod)
  const BasicInfoSchema = z.object({
    fullName: z.string().min(1, 'Full name is required'),
    gender: z.string().optional(),
    language: z.string().optional(),
    profilePicture: z.string().url('Enter a valid URL').optional().or(z.literal('')),
    dateOfBirth: z
      .string()
      .optional()
      .refine((v) => !v || new Date(v).getTime() <= new Date().setHours(0, 0, 0, 0), {
        message: 'Date of birth cannot be in the future',
      }),
    bloodGroup: z.string().optional(),
  });

  const AddressSchema = z.object({
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    pincode: z
      .string()
      .optional()
      .refine((v) => !v || /^\d{4,10}$/.test(v), { message: 'Pincode must be 4-10 digits' }),
    emergencyContactName: z.string().optional(),
    emergencyContactNumber: z.string().optional(),
  });

  const EmploymentSchema = z.object({
    employeeId: z.string().max(50, 'Employee ID too long').optional(),
  });

  const DoctorSchema = z.object({
    licenseNumber: z.string().min(1, 'License number is required'),
    qualification: z.string().optional(),
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
  const [profileData, setProfileData] = useState<ProfileData>({
    personal: {
      fullName: '',
      email: '',
      phone: '',
      profilePicture: '',
      dateOfBirth: '',
      gender: '',
      language: '',
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
      qualification: '',
      specialization: '',
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
    loadProfileData();
  }, []);

  const loadProfileData = () => {
    // TODO: Move setup data to Zustand store
    const setupData = null;
    const authStore = useAuthStore.getState();
    const userRole = authStore.getUserRole() || userType;
    
    if (setupData) {
      const data = JSON.parse(setupData);
      
      // Map setup data to profile structure
      setProfileData({
        personal: {
          fullName: data.doctor?.fullName || '',
          email: data.doctor?.email || '',
          phone: data.doctor?.phone || '',
          profilePicture: data.documents?.profilePicture || '',
          dateOfBirth: data.doctor?.dateOfBirth || '',
          gender: data.doctor?.gender || '',
          language: data.doctor?.language || '',
          bloodGroup: data.doctor?.bloodGroup || '',
          addressLine1: data.doctor?.addressLine1 || '',
          addressLine2: data.doctor?.addressLine2 || '',
          city: data.doctor?.city || '',
          state: data.doctor?.state || '',
          country: data.doctor?.country || '',
          pincode: data.doctor?.pincode || '',
          emergencyContactName: data.doctor?.emergencyContactName || '',
          emergencyContactNumber: data.doctor?.emergencyContactNumber || '',
          employeeId: employeeIdFromStore || ''
        },
        professional: {
          department: data.doctor?.department || data.doctor?.specialization || '',
          role: userRole,
          joiningDate: data.doctor?.joiningDate || new Date().toISOString().split('T')[0],
          qualification: data.doctor?.qualification || '',
          specialization: data.doctor?.specialization || '',
          licenseNumber: data.doctor?.licenseNumber || '',
          experienceYears: data.doctor?.experienceYears || 0,
          medicalCouncil: data.doctor?.medicalCouncil || '',
          registrationYear: data.doctor?.registrationYear || undefined,
          bio: data.doctor?.bio || ''
        },
        achievements: {
          totalPatients: Math.floor(Math.random() * 500) + 100,
          satisfactionRating: 4.5 + Math.random() * 0.5,
          yearsOfService: parseInt(data.doctor?.experience?.split(' ')[0] || '1'),
          certificationsCount: Math.floor(Math.random() * 10) + 3
        }
      });
    }
  };

  const calculateCompletionPercentage = () => {
    const allFields = [
      profileData.personal.fullName,
      profileData.personal.email,
      profileData.personal.phone,
      profileData.professional.department,
      profileData.professional.qualification,
      profileData.professional.specialization,
      profileData.professional.licenseNumber,
      profileData.personal.addressLine1,
      profileData.personal.profilePicture,
      profileData.professional.experienceYears
    ];
    
    const filledFields = allFields.filter(field => field && field.toString().trim() !== '').length;
    return Math.round((filledFields / allFields.length) * 100);
  };

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
      title: "Profile Updated! 🎉",
      description: "Your profile has been successfully updated.",
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
  };

  const completionPercentage = calculateCompletionPercentage();
  
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
    const result = BasicInfoSchema.safeParse({
      fullName: profileData.personal.fullName,
      gender: profileData.personal.gender,
      language: profileData.personal.language,
      profilePicture: profileData.personal.profilePicture,
      dateOfBirth: profileData.personal.dateOfBirth,
      bloodGroup: profileData.personal.bloodGroup,
    });
    const errs: FieldErrors = {};
    if (!result.success) result.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
    setBasicErrors(errs);
    return result.success;
  };

  const validateAddress = (): boolean => {
    const result = AddressSchema.safeParse({
      addressLine1: profileData.personal.addressLine1,
      addressLine2: profileData.personal.addressLine2,
      city: profileData.personal.city,
      state: profileData.personal.state,
      country: profileData.personal.country,
      pincode: profileData.personal.pincode,
      emergencyContactName: profileData.personal.emergencyContactName,
      emergencyContactNumber: profileData.personal.emergencyContactNumber,
    });
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

  const validateDoctor = (): boolean => {
    if (!isDoctorUser) return true;
    const result = DoctorSchema.safeParse({
      licenseNumber: profileData.professional.licenseNumber,
      qualification: profileData.professional.qualification,
      experienceYears: profileData.professional.experienceYears,
      medicalCouncil: profileData.professional.medicalCouncil,
      registrationYear: profileData.professional.registrationYear,
      bio: profileData.professional.bio,
    });
    const errs: FieldErrors = {};
    if (!result.success) result.error.issues.forEach((i) => (errs[i.path[0] as string] = i.message));
    setDoctorErrors(errs);
    return result.success;
  };

  const saveBasic = async () => {
    if (!validateBasic()) return;
    setSaving((s) => ({ ...s, basic: true }));
    try {
      toast({ title: 'Saved', description: 'Basic info updated.' });
    } finally {
      setSaving((s) => ({ ...s, basic: false }));
    }
  };

  const saveAddress = async () => {
    if (!validateAddress()) return;
    setSaving((s) => ({ ...s, address: true }));
    try {
      toast({ title: 'Saved', description: 'Address & contact updated.' });
    } finally {
      setSaving((s) => ({ ...s, address: false }));
    }
  };

  const saveEmployment = async () => {
    if (!validateEmployment()) return;
    setSaving((s) => ({ ...s, employment: true }));
    try {
      toast({ title: 'Saved', description: 'Employment info updated.' });
    } finally {
      setSaving((s) => ({ ...s, employment: false }));
    }
  };

  const saveDoctor = async () => {
    if (!validateDoctor()) return;
    setSaving((s) => ({ ...s, doctor: true }));
    try {
      toast({ title: 'Saved', description: 'Professional details updated.' });
    } finally {
      setSaving((s) => ({ ...s, doctor: false }));
    }
  };

  // Gamification elements
  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressMessage = (percentage: number) => {
    if (percentage >= 90) return "🎉 Profile Master! You're all set!";
    if (percentage >= 70) return "🌟 Almost there! Just a few more details.";
    if (percentage >= 50) return "⚡ Good progress! Keep going!";
    return "🚀 Let's complete your profile journey!";
  };

  const getBadgeForCompletion = (percentage: number) => {
    if (percentage >= 90) return { icon: Trophy, text: "Profile Master", color: "bg-yellow-100 text-yellow-800" };
    if (percentage >= 70) return { icon: Star, text: "Profile Expert", color: "bg-blue-100 text-blue-800" };
    if (percentage >= 50) return { icon: Target, text: "Profile Builder", color: "bg-green-100 text-green-800" };
    return { icon: Zap, text: "Profile Starter", color: "bg-purple-100 text-purple-800" };
  };

  const badge = getBadgeForCompletion(completionPercentage);

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 lg:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">My Profile</h1>
              <p className="text-muted-foreground">Manage your personal and professional information</p>
            </div>
          </div>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "outline" : "default"}
            className="flex items-center gap-2"
          >
            <Edit3 className="h-4 w-4" />
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </Button>
        </div>
      </div>

      {/* Profile Completion Card */}
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-2 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <badge.icon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">Profile Completion</h3>
                  <Badge className={badge.color}>
                    <badge.icon className="h-3 w-3 mr-1" />
                    {badge.text}
                  </Badge>
                </div>
                <p className={`text-sm ${getProgressColor(completionPercentage)} font-medium`}>
                  {getProgressMessage(completionPercentage)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary mb-1">{completionPercentage}%</div>
              <Progress value={completionPercentage} className="w-32 h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Summary Card */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6 text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profileData.personal.profilePicture} />
                <AvatarFallback className="text-lg">
                  {profileData.personal.fullName.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <ProfilePhotoUploader
                  initialUrl={profileData.personal.profilePicture}
                  disabled={!isEditing}
                  onChange={(dataUrl) => handleInputChange('personal', 'profilePicture', dataUrl)}
                  onUploaded={(urls) => handleInputChange('personal', 'profilePicture', urls.full || urls.medium || urls.thumb)}
                  onRemoved={() => handleInputChange('personal', 'profilePicture', '')}
                  buttonVariant="link"
                />
              )}
            </div>

            <div className="space-y-3 text-left">
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Full name</p>
                <p className="font-medium">
                  {profileData.personal.fullName || '—'}
                </p>
              </div>
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Phone number</p>
                <p className="font-medium">
                  {profileData.personal.phone || '—'}
                </p>
              </div>
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Employee ID</p>
                <p className="font-medium">
                  {employeeIdFromStore || profileData.personal.employeeId || '—'}
                </p>
              </div>
            </div>
          
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <Accordion type="multiple" value={expanded} onValueChange={(v) => setExpanded(v as string[])}>
              {/* Doctor Professional at top */}
              {isDoctorUser && (
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
                      value={profileData.professional.department || ''}
                      onValueChange={(val) => handleInputChange('professional', 'department' as any, val)}
                      disabled={!isEditing}
                    >
                      <SelectTrigger id="department" className="mt-1">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent className="max-h-56 overflow-y-auto">
                        {departmentOptions.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="licenseNumber">Medical License Number *</Label>
                    <Input
                      id="licenseNumber"
                      value={profileData.professional.licenseNumber}
                      onChange={(e) => handleInputChange('professional', 'licenseNumber', e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                    {doctorErrors.licenseNumber && <p className="text-xs text-amber-600 mt-1">{doctorErrors.licenseNumber}</p>}
                  </div>
                  <div>
                    <Label htmlFor="qualification">Qualification</Label>
                    <Input
                      id="qualification"
                      value={profileData.professional.qualification || ''}
                      onChange={(e) => handleInputChange('professional', 'qualification', e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="experienceYears">Years of Experience</Label>
                    <Input
                      id="experienceYears"
                      type="number"
                      value={profileData.professional.experienceYears ?? 0}
                      onChange={(e) => handleInputChange('professional', 'experienceYears' as any, e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="medicalCouncil">Medical Council</Label>
                    <Input
                      id="medicalCouncil"
                      value={profileData.professional.medicalCouncil || ''}
                      onChange={(e) => handleInputChange('professional', 'medicalCouncil' as any, e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="registrationYear">Registration Year</Label>
                    <Input
                      id="registrationYear"
                      type="number"
                      value={profileData.professional.registrationYear || ''}
                      onChange={(e) => handleInputChange('professional', 'registrationYear' as any, e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                    {doctorErrors.registrationYear && <p className="text-xs text-amber-600 mt-1">{doctorErrors.registrationYear}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={profileData.professional.bio || ''}
                      onChange={(e) => handleInputChange('professional', 'bio' as any, e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                      rows={4}
                    />
                  </div>
                  </div>
                  {Object.entries(doctorErrors).map(([k, v]) => v && (
                    <p key={k} className="text-xs text-amber-600">{v}</p>
                  ))}
                  {isEditing && (
                    <div className="flex justify-end">
                      <Button onClick={saveDoctor} disabled={!!saving.doctor}>Save Professional</Button>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
              )}

              {/* Basic Info */}
              <AccordionItem value="basic">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>Basic Info</span>
                    <span className={`text-xs ml-2 ${Object.keys(basicErrors).length ? 'text-amber-600' : 'text-green-600'}`}>
                      {Object.keys(basicErrors).length ? '⚠︎' : '✓'}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={profileData.personal.fullName}
                      onChange={(e) => handleInputChange('personal', 'fullName', e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profileData.personal.email}
                      onChange={(e) => handleInputChange('personal', 'email', e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={profileData.personal.phone}
                      onChange={(e) => handleInputChange('personal', 'phone', e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={profileData.personal.dateOfBirth}
                      onChange={(e) => handleInputChange('personal', 'dateOfBirth', e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gender</Label>
                    <Input
                      id="gender"
                      value={profileData.personal.gender || ''}
                      onChange={(e) => handleInputChange('personal', 'gender' as any, e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="language">Language</Label>
                    <Input
                      id="language"
                      value={profileData.personal.language || ''}
                      onChange={(e) => handleInputChange('personal', 'language' as any, e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bloodGroup">Blood Group</Label>
                    <Input
                      id="bloodGroup"
                      value={profileData.personal.bloodGroup || ''}
                      onChange={(e) => handleInputChange('personal', 'bloodGroup' as any, e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="profilePicture">Profile Picture URL</Label>
                    <Input
                      id="profilePicture"
                      value={profileData.personal.profilePicture || ''}
                      onChange={(e) => handleInputChange('personal', 'profilePicture' as any, e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  {/* Employee ID moved near avatar and read-only */}
                </div>
                {Object.entries(basicErrors).map(([k, v]) => v && (
                  <p key={k} className="text-xs text-amber-600">{v}</p>
                ))}
                {isEditing && (
                  <div className="flex justify-end">
                    <Button onClick={saveBasic} disabled={!!saving.basic}>Save Basic Info</Button>
                  </div>
                )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Address & Contact */}
              <AccordionItem value="address">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>Address & Contact</span>
                    <span className={`text-xs ml-2 ${Object.keys(addressErrors).length ? 'text-amber-600' : 'text-green-600'}`}>
                      {Object.keys(addressErrors).length ? '⚠︎' : '✓'}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="address1">Address Line 1</Label>
                    <Input
                      id="address1"
                      value={profileData.personal.addressLine1 || ''}
                      onChange={(e) => handleInputChange('personal', 'addressLine1' as any, e.target.value)}
                      disabled={!isEditing}
                      className="mt-1"
                    />
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
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={profileData.personal.city || ''} onChange={(e) => handleInputChange('personal', 'city' as any, e.target.value)} disabled={!isEditing} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input id="state" value={profileData.personal.state || ''} onChange={(e) => handleInputChange('personal', 'state' as any, e.target.value)} disabled={!isEditing} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" value={profileData.personal.country || ''} onChange={(e) => handleInputChange('personal', 'country' as any, e.target.value)} disabled={!isEditing} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input id="pincode" value={profileData.personal.pincode || ''} onChange={(e) => handleInputChange('personal', 'pincode' as any, e.target.value)} disabled={!isEditing} className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergencyName">Emergency Contact Name</Label>
                    <Input id="emergencyName" value={profileData.personal.emergencyContactName || ''} onChange={(e) => handleInputChange('personal', 'emergencyContactName' as any, e.target.value)} disabled={!isEditing} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="emergencyNumber">Emergency Contact Number</Label>
                    <Input id="emergencyNumber" value={profileData.personal.emergencyContactNumber || ''} onChange={(e) => handleInputChange('personal', 'emergencyContactNumber' as any, e.target.value)} disabled={!isEditing} className="mt-1" />
                  </div>
                </div>
                {Object.entries(addressErrors).map(([k, v]) => v && (
                  <p key={k} className="text-xs text-amber-600">{v}</p>
                ))}
                {isEditing && (
                  <div className="flex justify-end">
                    <Button onClick={saveAddress} disabled={!!saving.address}>Save Address</Button>
                  </div>
                )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Employment section removed (Employee ID moved near avatar) */}

              {/* Doctor Professional (moved to top) removed here to avoid duplicate */}
            </Accordion>

            {isEditing && (
              <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Achievement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200">
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-700">{profileData.achievements.totalPatients}</div>
            <div className="text-sm text-blue-600">Total Patients Served</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200">
          <CardContent className="p-4 text-center">
            <Star className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-700">{profileData.achievements.satisfactionRating.toFixed(1)}/5.0</div>
            <div className="text-sm text-green-600">Patient Satisfaction</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200">
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-purple-700">{profileData.achievements.yearsOfService}</div>
            <div className="text-sm text-purple-600">Years of Service</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20 border-yellow-200">
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-yellow-700">{profileData.achievements.certificationsCount}</div>
            <div className="text-sm text-yellow-600">Certifications</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;


