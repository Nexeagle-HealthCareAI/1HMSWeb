import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';

import { Users, UserPlus, Mail, AlertCircle, ChevronLeft, ChevronRight, LayoutDashboard, CheckCircle, ArrowRight, Send, Sparkles, Trophy, Stethoscope, Shield, Heart, Phone, User, FileText, Briefcase, Contact, ShieldCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useUserManagementApi } from '../hooks/useUserManagementApi';
import { RolesResponse, InviteUserRequest } from '../services/userManagementApi';
import { OnboardedUsers } from './OnboardedUsers';
import { InvitedUsers } from './InvitedUsers';
import { InvitationSuccessModal } from './InvitationSuccessModal';
import { DoctorInviteForm } from './DoctorInviteForm';
import type { DoctorProfessionalFormData } from './DoctorInviteForm';
import { PersonalInfoInviteForm } from './PersonalInfoInviteForm';
import type { PersonalInfoFormData } from './PersonalInfoInviteForm';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/features/auth/services/authApi';
import { doctorApi } from '@/features/doctor/services/doctorApi';
import { userProfileApi } from '@/features/profile/services/userProfileApi';
import { ValidationUtils } from '@/utils/validation';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('onboarded');
  const [invitedUsersScope, setInvitedUsersScope] = useState<'Pending' | 'Accepted' | 'Revoked' | 'ALL'>('ALL');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // API hooks
  const { getAllRoles, inviteUser } = useUserManagementApi();
  const { data: rolesResponse, isLoading: rolesLoading, error: rolesError } = getAllRoles();
  const typedRolesResponse = rolesResponse as RolesResponse | undefined;

  // Auth store
  const authStore = useAuthStore.getState();
  const currentUserId = authStore.getUserId();
  const hospitalId = authStore.getHospitalId();

  // User management states
  const [showAddUser, setShowAddUser] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [invitedUserInfo, setInvitedUserInfo] = useState({
    name: '',
    email: '',
    role: ''
  });
  const [inviteErrorModal, setInviteErrorModal] = useState({ open: false, message: '' });

  // Multi-step invite states
  // Step 1: Basic info, Step 2: Doctor professional (doctor roles only), Step 3: Personal info (doctor roles only), Step 4: Success
  const [inviteStep, setInviteStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Collected data across steps (APIs called on final submit only)
  const [doctorFormData, setDoctorFormData] = useState<DoctorProfessionalFormData | null>(null);
  const [personalFormData, setPersonalFormData] = useState<PersonalInfoFormData | null>(null);

  // Form states
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    selectedRole: '',
    specialty: '',
    workingHours: ''
  });

  // Real-time validation states
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const isFormValid =
    Boolean(newUser.name && newUser.phone && newUser.selectedRole && !phoneError && !emailError);

  // Helper: check if selected role is Doctor or AdminDoctor
  const isDoctorRole = (): boolean => {
    if (!newUser.selectedRole || !typedRolesResponse?.allRoles) return false;
    const selectedRole = typedRolesResponse.allRoles.find(r => r.roleId === newUser.selectedRole);
    if (!selectedRole) return false;
    const roleLower = selectedRole.roleName.toLowerCase();
    return roleLower === 'doctor' || roleLower === 'admindoctor';
  };

  // Helper: check if role needs personal info step
  const needsPersonalInfo = (): boolean => {
    if (!newUser.selectedRole || !typedRolesResponse?.allRoles) return false;
    const selectedRole = typedRolesResponse.allRoles.find(r => r.roleId === newUser.selectedRole);
    if (!selectedRole) return false;
    const roleLower = selectedRole.roleName.toLowerCase();
    return roleLower === 'doctor' || roleLower === 'admindoctor' || roleLower === 'admin' || roleLower === 'nurse' || roleLower === 'receptionist';
  };

  // Reset invite dialog to initial state
  const resetInviteDialog = () => {
    setNewUser({ name: '', email: '', phone: '', selectedRole: '', specialty: '', workingHours: '' });
    setInviteStep(1);
    setIsSubmitting(false);
    setDoctorFormData(null);
    setPersonalFormData(null);
    setEmailError('');
    setPhoneError('');
  };

  // Step configuration for gamified progress
  const stepConfig = [
    { num: 1, label: 'Basic Info', emoji: '👤', icon: UserPlus },
    { num: 2, label: 'Professional', emoji: '🩺', icon: Stethoscope },
    { num: 3, label: 'Personal', emoji: '📋', icon: FileText },
    { num: 4, label: 'Complete!', emoji: '🎉', icon: Trophy },
  ];

  // Role display info with icons and gradients
  const getRoleInfo = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return { icon: Shield, gradient: 'from-red-500 to-rose-600', bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300', desc: 'Full system access' };
      case 'admindoctor':
        return { icon: Stethoscope, gradient: 'from-purple-500 to-violet-600', bg: 'bg-purple-50 dark:bg-purple-950/20', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', desc: 'Admin + Clinical access' };
      case 'doctor':
        return { icon: Stethoscope, gradient: 'from-blue-500 to-cyan-600', bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', desc: 'Clinical & patient care' };
      case 'nurse':
        return { icon: Heart, gradient: 'from-green-500 to-emerald-600', bg: 'bg-green-50 dark:bg-green-950/20', border: 'border-green-200 dark:border-green-800', text: 'text-green-700 dark:text-green-300', desc: 'Patient care support' };
      case 'receptionist':
        return { icon: Phone, gradient: 'from-orange-500 to-amber-600', bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300', desc: 'Front desk operations' };
      default:
        return { icon: User, gradient: 'from-gray-500 to-slate-600', bg: 'bg-gray-50 dark:bg-gray-950/20', border: 'border-gray-200 dark:border-gray-800', text: 'text-gray-700 dark:text-gray-300', desc: 'Standard access' };
    }
  };

  // Get the step title for the dialog
  const getStepTitle = () => {
    switch (inviteStep) {
      case 1: return t('userManagement.inviteNewUser');
      case 2: return 'Doctor Professional Profile';
      case 3: return 'Personal Information';
      case 4: return 'Onboarding Complete';
      default: return t('userManagement.inviteNewUser');
    }
  };

  // Get step indicator text
  const getStepIndicator = () => {
    const totalSteps = isDoctorRole() ? 4 : (needsPersonalInfo() ? 3 : 2);
    let currentDisplayStep = inviteStep;
    if (!isDoctorRole() && inviteStep >= 3) currentDisplayStep = inviteStep - 1;
    if (inviteStep === 4) currentDisplayStep = totalSteps;

    return `Step ${currentDisplayStep} of ${totalSteps}`;
  };

  const getVisibleSteps = () => {
    const steps = [stepConfig[0]]; // Basic Info is always first
    if (isDoctorRole()) steps.push(stepConfig[1]);
    if (needsPersonalInfo()) steps.push(stepConfig[2]);
    steps.push(stepConfig[3]); // Success is always last
    return steps;
  };

  // Validation helpers
  const validateName = (name: string) => {
    if (!name.trim()) return t('userManagement.validation.nameRequired') || 'Full Name is required';
    if (name.trim().length < 2) return t('userManagement.validation.nameTooShort') || 'Name must be at least 2 characters';
    return '';
  };
  const validateEmail = (email: string) => {
    if (!email) return '';
    // Simple email regex
    return /^[\w-.]+@[\w-]+\.[a-zA-Z]{2,}$/.test(email)
      ? ''
      : t('userManagement.validation.email');
  };
  const validatePhone = (phone: string) => {
    if (!phone) return t('userManagement.validation.phoneRequired') || 'Phone number is required';
    // Accepts 10 digit numbers only
    return /^\d{10}$/.test(phone)
      ? ''
      : t('userManagement.validation.phone');
  };

  const navigationItems: Array<{
    value: 'onboarded' | 'invited';
    title: string;
    description: string;
    Icon: LucideIcon;
  }> = [
      {
        value: 'onboarded',
        title: t('userManagement.tabs.onboarded'),
        description: t('userManagement.activeUsers'),
        Icon: Users,
      },
      {
        value: 'invited',
        title: t('userManagement.tabs.invited'),
        description: t('userManagement.pendingInvitations'),
        Icon: Mail,
      }
    ];



  // Step 1 → Next: Validate basic info only (no API call)
  const handleNextStep = () => {
    const nError = validateName(newUser.name);
    const eError = validateEmail(newUser.email);
    const pError = validatePhone(newUser.phone);
    const rError = !newUser.selectedRole;

    setNameError(nError);
    setEmailError(eError);
    setPhoneError(pError);

    if (nError || eError || pError || rError) {
      if (rError) {
        toast({
          title: "Select a Role",
          description: "Please select a role before continuing.",
          variant: "destructive",
        });
      }
      return;
    }

    if (isDoctorRole()) {
      // Doctor/AdminDoctor: go to step 2 (doctor professional)
      setInviteStep(2);
    } else if (needsPersonalInfo()) {
      // Admin/Nurse/Receptionist: go directly to step 3 (personal info)
      setInviteStep(3);
    } else {
      // Non-doctor, no personal info: submit immediately (register + invite)
      handleFinalSubmitNonDoctor();
    }
  };

  // Step 2 → Next: Doctor form passes validated data back
  const handleDoctorFormNext = (data: DoctorProfessionalFormData) => {
    setDoctorFormData(data);
    setInviteStep(3);
  };

  // Step 3 → Submit: Personal form passes validated data, then run all APIs
  const handlePersonalFormSubmit = async (data: PersonalInfoFormData) => {
    setPersonalFormData(data);
    await handleFinalOnboarding(data);
  };

  // Final submit for all roles that reach Step 3: register → [createDoctorProfile] → updateUserDetails → inviteUser
  const handleFinalOnboarding = async (personalData: PersonalInfoFormData) => {
    if (!currentUserId || !hospitalId) return;

    const selectedRole = typedRolesResponse?.allRoles.find(r => r.roleId === newUser.selectedRole);
    const roleName = selectedRole?.roleName || '';

    setIsSubmitting(true);
    try {
      // 1. Send invitation
      const inviteData: InviteUserRequest = {
        hospitalId,
        roleId: newUser.selectedRole,
        name: newUser.name,
        mobile: ValidationUtils.cleanMobileNumber(newUser.phone),
        email: newUser.email,
        invitedByUserId: currentUserId,
      };
      const inviteResponse = await inviteUser.mutateAsync(inviteData);
      if (!inviteResponse.success) {
        setInviteErrorModal({ open: true, message: inviteResponse.message || t('userManagement.inviteError.defaultMessage') });
        return;
      }

      // 2. Register user
      let userId: string | null = null;
      let registerMessage: string = '';
      try {
        const registerResponse = await authApi.register({
          mobileNumber: ValidationUtils.cleanMobileNumber(newUser.phone),
          roles: roleName,
        });
        userId = registerResponse?.userId || null;
        registerMessage = registerResponse?.message || '';
      } catch (regError: any) {
        // User may already exist — check for userId in error response
        const responseData = regError?.response?.data;
        if (responseData?.userId) {
          userId = responseData.userId;
        } else {
          throw new Error(responseData?.message || 'Failed to register user');
        }
      }

      if (!userId) {
        throw new Error(registerMessage || 'Registration did not return a user ID');
      }

      // 3. Create doctor profile
      if (doctorFormData) {
        await doctorApi.createDoctorProfile({
          userId,
          hospitalId,
          licenseNumber: doctorFormData.licenseNumber,
          qualification: doctorFormData.qualification,
          experienceYears: doctorFormData.experienceYears,
          medicalCouncil: doctorFormData.medicalCouncil,
          registrationYear: doctorFormData.registrationYear,
          bio: doctorFormData.bio,
          primaryDepartment: doctorFormData.primaryDepartment,
          department: doctorFormData.department,
          specializations: doctorFormData.specializations,
          hospitalDepartmentMappingId: doctorFormData.hospitalDepartmentMappingId,
        });
      }

      // 4. Update personal info
      await userProfileApi.updateUserDetails({
        userId,
        mobileNumber: ValidationUtils.cleanMobileNumber(personalData.phone),
        isActive: true,
        fullName: personalData.fullName,
        gender: personalData.gender || '',
        profilePictureURL: '',
        employeeID: personalData.employeeId || '',
        dateOfBirth: personalData.dateOfBirth ? new Date(personalData.dateOfBirth).toISOString() : '',
        bloodGroup: personalData.bloodGroup || '',
        addressLine1: personalData.addressLine1 || '',
        addressLine2: personalData.addressLine2 || '',
        city: personalData.city || '',
        state: personalData.state || '',
        country: personalData.country || '',
        pincode: personalData.pincode || '',
        emergencyContactName: personalData.emergencyContactName || '',
        emergencyContactNumber: personalData.emergencyContactNumber || '',
      });

      // Show success
      setInvitedUserInfo({
        name: newUser.name,
        email: newUser.email,
        role: roleName,
      });
      setInviteStep(4);
    } catch (error: any) {
      console.error('Error during doctor onboarding:', error);
      toast({
        title: 'Onboarding Failed',
        description: error?.message || 'An error occurred during onboarding. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Final submit for non-doctor roles: register → inviteUser
  const handleFinalSubmitNonDoctor = async () => {
    if (!currentUserId || !hospitalId) return;

    const selectedRole = typedRolesResponse?.allRoles.find(r => r.roleId === newUser.selectedRole);
    const roleName = selectedRole?.roleName || '';

    setIsSubmitting(true);
    try {
      // 1. Send invitation
      const inviteData: InviteUserRequest = {
        hospitalId,
        roleId: newUser.selectedRole,
        name: newUser.name,
        mobile: ValidationUtils.cleanMobileNumber(newUser.phone),
        email: newUser.email,
        invitedByUserId: currentUserId,
      };
      const response = await inviteUser.mutateAsync(inviteData);
      if (!response.success) {
        setInviteErrorModal({ open: true, message: response.message || t('userManagement.inviteError.defaultMessage') });
        return;
      }

      // 2. Register user
      try {
        await authApi.register({
          mobileNumber: ValidationUtils.cleanMobileNumber(newUser.phone),
          roles: roleName,
        });
      } catch (regError: any) {
        // If user already exists with userId, that's fine
        const responseData = regError?.response?.data;
        if (!responseData?.userId) {
          throw new Error(responseData?.message || 'Failed to register user');
        }
      }

      setInvitedUserInfo({
        name: newUser.name,
        email: newUser.email,
        role: roleName,
      });
      resetInviteDialog();
      setShowAddUser(false);
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to invite user. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get role color for display
  const getRoleColor = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'admindoctor':
        return 'bg-purple-100 text-purple-800';
      case 'doctor':
        return 'bg-blue-100 text-blue-800';
      case 'nurse':
        return 'bg-green-100 text-green-800';
      case 'receptionist':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Handle view invited users navigation
  const handleViewInvitedUsers = () => {
    setActiveTab('invited');
    setInvitedUsersScope('ALL');
    setShowSuccessModal(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out flex flex-col z-20 relative hidden lg:flex",
          isSidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Toggle Button */}
        <div className="absolute -right-3 top-6 z-30">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Sidebar Header */}
        <div className={cn(
          "h-16 flex items-center border-b border-dashed border-gray-200 dark:border-gray-800",
          isSidebarCollapsed ? "justify-center px-0" : "px-6"
        )}>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <LayoutDashboard className="h-6 w-6" />
            {!isSidebarCollapsed && (
              <span className="font-bold text-lg tracking-tight">Workspace</span>
            )}
          </div>
        </div>

        {/* Nav Items */}
        <div className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => {
            const isActive = activeTab === item.value;
            return (
              <button
                key={item.value}
                onClick={() => setActiveTab(item.value)}
                className={cn(
                  "flex items-center w-full p-3 rounded-xl transition-all duration-200 group relative",
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200",
                  isSidebarCollapsed ? "justify-center" : "gap-3"
                )}
                title={isSidebarCollapsed ? item.title : undefined}
              >
                <item.Icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors",
                  isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
                )} />

                {!isSidebarCollapsed && (
                  <div className="text-left overflow-hidden">
                    <p className="font-medium text-sm whitespace-nowrap">{item.title}</p>
                    <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{item.description}</p>
                  </div>
                )}

                {isActive && !isSidebarCollapsed && (
                  <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative w-full h-full bg-gray-50/50 dark:bg-black/20 p-4 lg:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button className="w-full sm:w-auto gap-2" onClick={() => setShowAddUser(true)}>
              <Mail className="h-4 w-4" />
              {t('userManagement.inviteUser')}
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="lg:hidden">
              <TabsList className="flex gap-2 rounded-2xl bg-muted/40 p-1">
                {navigationItems.map((item) => (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className="group relative flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
                  >
                    <item.Icon className="h-4 w-4 text-muted-foreground group-data-[state=active]:text-primary" />
                    <span>{item.title}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="onboarded" className="space-y-6">
              <OnboardedUsers />
            </TabsContent>

            <TabsContent value="invited" className="space-y-6">
              <InvitedUsers initialScope={invitedUsersScope} />
            </TabsContent>
          </Tabs>
        </div>
      </main>


      {/* Add User Dialog — Multi-Step Gamified */}
      <Dialog open={showAddUser} onOpenChange={(open) => {
        if (!open) resetInviteDialog();
        setShowAddUser(open);
      }}>
        <DialogContent className="overflow-hidden p-0 gap-0 flex flex-col !w-[100vw] !h-[100dvh] !max-w-[100vw] !max-h-[100dvh] rounded-none sm:!w-[98vw] sm:!h-[96vh] sm:!max-w-[98vw] sm:!max-h-[96vh] sm:rounded-lg">
          {/* Gradient Header */}
          <div className={cn(
            "px-4 pt-3 pb-2 bg-gradient-to-r rounded-t-lg",
            inviteStep === 4
              ? 'from-green-500/10 via-emerald-500/10 to-teal-500/10'
              : 'from-blue-500/10 via-indigo-500/10 to-purple-500/10'
          )}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-base">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-sm",
                  inviteStep === 4
                    ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white'
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                )}>
                  {stepConfig[inviteStep - 1]?.emoji}
                </div>
                <div>
                  <span>{getStepTitle()}</span>
                  {isDoctorRole() && inviteStep < 4 && (
                    <p className="text-[10px] font-normal text-muted-foreground">
                      Step {inviteStep} of {isDoctorRole() ? 3 : 1} — {stepConfig[inviteStep - 1]?.label}
                    </p>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>

            {/* Gamified Step Progress */}
            {inviteStep <= 4 && (
              <div className="flex items-center justify-between mt-2.5 px-1 max-w-2xl mx-auto">
                {getVisibleSteps().map((step, idx, arr) => {
                  const isCompleted = inviteStep > step.num || (inviteStep === 3 && step.num === 2 && !isDoctorRole());
                  const isCurrent = inviteStep === step.num;
                  const StepIcon = step.icon;
                  return (
                    <React.Fragment key={step.num}>
                      <div className="flex flex-col items-center gap-1">
                        <div className={cn(
                          "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 relative",
                          isCompleted
                            ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-md shadow-green-500/25'
                            : isCurrent
                              ? 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white shadow-md shadow-blue-500/30 scale-110 ring-2 ring-blue-200/50 dark:ring-blue-800/50'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'
                        )}>
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <StepIcon className="h-3.5 w-3.5" />
                          )}
                          {isCurrent && (
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-400 rounded-full animate-ping" />
                          )}
                        </div>
                        <span className={cn(
                          "text-[9px] font-medium transition-colors",
                          isCompleted ? 'text-green-600 dark:text-green-400'
                            : isCurrent ? 'text-blue-600 dark:text-blue-400 font-semibold'
                              : 'text-gray-400 dark:text-gray-600'
                        )}>
                          {step.label}
                        </span>
                      </div>
                      {idx < arr.length - 1 && (
                        <div className={cn(
                          "flex-1 h-0.5 mx-0.5 sm:mx-1 rounded-full transition-all duration-500",
                          inviteStep > step.num || (inviteStep === 3 && step.num === 2 && !isDoctorRole())
                            ? 'bg-gradient-to-r from-green-400 to-emerald-400'
                            : 'bg-gray-200 dark:bg-gray-800'
                        )} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>

          <div className="px-5 py-3 overflow-y-auto flex-1">
            {/* Step 1: Basic Info */}
            {inviteStep === 1 && (
              <div className="space-y-8 py-2 max-w-5xl mx-auto">
                {/* Section 1: Identity & Contact */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-100 dark:border-gray-800">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <Contact className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 italic">Identity & Contact</h4>
                      <p className="text-[10px] text-muted-foreground">Basic information of the invitee</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                    <div className="sm:col-span-5 space-y-1.5">
                      <Label htmlFor="name" className="text-[11px] font-medium flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        {t('userManagement.fullName')} <span className="text-red-500">*</span>
                        {nameError && <AlertCircle className="h-3 w-3 text-red-500 animate-pulse" />}
                      </Label>
                      <Input
                        id="name"
                        value={newUser.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewUser({ ...newUser, name: val });
                          if (nameError) setNameError(validateName(val));
                        }}
                        onBlur={() => setNameError(validateName(newUser.name))}
                        placeholder={t('userManagement.enterFullName')}
                        required
                        className={cn("h-9 text-sm transition-all focus:ring-blue-500/20", nameError && 'border-red-400 ring-2 ring-red-100')}
                      />
                      {nameError && <p className="text-[10px] text-red-500 flex items-center gap-1 mt-1 font-medium"><AlertCircle className="h-3 w-3" />{nameError}</p>}
                    </div>

                    <div className="sm:col-span-3 space-y-1.5">
                      <Label htmlFor="phone" className="text-[11px] font-medium flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        {t('userManagement.phone')} <span className="text-red-500">*</span>
                        {phoneError && <AlertCircle className="h-3 w-3 text-red-500 animate-pulse" />}
                      </Label>
                      <Input
                        id="phone"
                        value={newUser.phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setNewUser({ ...newUser, phone: val });
                          if (phoneError) setPhoneError(validatePhone(val));
                        }}
                        onBlur={() => setPhoneError(validatePhone(newUser.phone))}
                        placeholder={t('userManagement.enterPhoneNumber')}
                        required
                        maxLength={10}
                        className={cn("h-9 text-sm transition-all focus:ring-blue-500/20", phoneError && 'border-red-400 ring-2 ring-red-100')}
                      />
                      {phoneError && <p className="text-[10px] text-red-500 flex items-center gap-1 mt-1 font-medium"><AlertCircle className="h-3 w-3" />{phoneError}</p>}
                    </div>

                    <div className="sm:col-span-4 space-y-1.5">
                      <Label htmlFor="email" className="text-[11px] font-medium text-gray-600 dark:text-gray-400">{t('userManagement.email')}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewUser({ ...newUser, email: val });
                          if (emailError) setEmailError(validateEmail(val));
                        }}
                        placeholder={t('userManagement.enterEmailAddress')}
                        className={cn("h-9 text-sm transition-all focus:ring-blue-500/20", emailError && 'border-red-400 ring-2 ring-red-100')}
                      />
                      {emailError && <p className="text-[10px] text-red-500 flex items-center gap-1 mt-1 font-medium"><AlertCircle className="h-3 w-3" />{emailError}</p>}
                    </div>
                  </div>
                </div>

                {/* Section 2: Role & Access */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-1 border-b border-gray-100 dark:border-gray-800">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                      <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 italic">Role & Access Level</h4>
                      <p className="text-[10px] text-muted-foreground">Define system permissions and access scope</p>
                    </div>
                    <div className="ml-auto">
                      {!newUser.selectedRole && <span className="text-[9px] font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full animate-pulse border border-red-100 dark:border-red-900/50">Required</span>}
                    </div>
                  </div>

                  <div className="bg-gray-50/30 dark:bg-gray-900/20 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    {rolesLoading ? (
                      <div className="py-2 text-center text-muted-foreground">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent mx-auto mb-1"></div>
                        <p className="text-[10px]">{t('userManagement.loadingRoles')}</p>
                      </div>
                    ) : rolesError ? (
                      <div className="py-2 text-center text-red-600">
                        <p className="text-xs">{t('userManagement.errorLoadingRoles')}</p>
                      </div>
                    ) : (
                      <RadioGroup
                        value={newUser.selectedRole}
                        onValueChange={(value) => setNewUser({ ...newUser, selectedRole: value })}
                      >
                        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2">
                          {typedRolesResponse?.allRoles
                            ?.filter((role, idx, arr) =>
                              arr.findIndex(r => r.roleName.toLowerCase() === role.roleName.toLowerCase()) === idx
                            )
                            .map(role => {
                              const info = getRoleInfo(role.roleName);
                              const RoleIcon = info.icon;
                              const isSelected = newUser.selectedRole === role.roleId;
                              return (
                                <TooltipProvider key={role.roleId}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={cn(
                                          "flex items-center gap-1.5 px-3 py-2 rounded-xl border cursor-pointer transition-all duration-200 group relative overflow-hidden h-full",
                                          isSelected
                                            ? `${info.bg} ${info.border} shadow-sm ring-1 ring-offset-0 ${info.border}`
                                            : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/50'
                                        )}
                                        onClick={() => setNewUser({ ...newUser, selectedRole: role.roleId })}
                                      >
                                        <RadioGroupItem value={role.roleId} id={role.roleId} className="sr-only" />
                                        <div className={cn(
                                          "w-7 h-7 rounded-lg flex items-center justify-center transition-all flex-shrink-0",
                                          isSelected
                                            ? `bg-gradient-to-br ${info.gradient} text-white shadow-md`
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:scale-110'
                                        )}>
                                          <RoleIcon className="h-4 w-4" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className={cn(
                                            "text-xs font-semibold truncate",
                                            isSelected ? info.text : 'text-foreground'
                                          )}>{role.roleName}</span>
                                          <span className="text-[9px] text-muted-foreground truncate opacity-70">
                                            {info.desc.split(' ')[0]}...
                                          </span>
                                        </div>
                                        {isSelected && (
                                          <div className={cn("absolute top-1 right-1 h-1.5 w-1.5 rounded-full", info.gradient.split(' ')[0])} />
                                        )}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p className="text-xs font-medium">{role.roleName}</p>
                                      <p className="text-[10px] opacity-90">{info.desc}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              );
                            })}
                        </div>
                      </RadioGroup>
                    )}
                  </div>
                </div>

                {/* Action buttons with better separation */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
                  <Button variant="outline" onClick={() => { resetInviteDialog(); setShowAddUser(false); }} className="h-8 px-4 text-sm">
                    {t('userManagement.cancel')}
                  </Button>
                  <Button
                    onClick={handleNextStep}
                    disabled={!isFormValid || isSubmitting}
                    className={cn(
                      "h-8 px-5 gap-2 text-sm font-semibold transition-all duration-300",
                      isFormValid && !isSubmitting
                        ? isDoctorRole()
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40'
                          : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/25 hover:shadow-green-500/40'
                        : ''
                    )}
                  >
                    {isSubmitting && !isDoctorRole() ? (
                      <>
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                        Submitting...
                      </>
                    ) : isDoctorRole() ? (
                      <>
                        Next
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Register & Send Invite
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Doctor Professional Profile */}
            {inviteStep === 2 && (
              <DoctorInviteForm
                hospitalId={hospitalId || ''}
                onNext={handleDoctorFormNext}
                onBack={() => setInviteStep(1)}
                initialData={doctorFormData}
              />
            )}

            {/* Step 3: Personal Information */}
            {inviteStep === 3 && (
              <PersonalInfoInviteForm
                prefillName={newUser.name}
                prefillPhone={newUser.phone}
                prefillEmail={newUser.email}
                onSubmit={handlePersonalFormSubmit}
                onBack={() => {
                  if (isDoctorRole()) {
                    setInviteStep(2);
                  } else {
                    setInviteStep(1);
                  }
                }}
                isSubmitting={isSubmitting}
                initialData={personalFormData}
              />
            )}

            {/* Step 4: Success — Celebration */}
            {inviteStep === 4 && (
              <div className="flex flex-col items-center text-center py-5 space-y-3 relative overflow-hidden">
                {/* Decorative background rings */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 rounded-full border-2 border-green-200/30 dark:border-green-800/20 animate-ping" style={{ animationDuration: '3s' }} />
                </div>

                {/* Trophy icon */}
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-green-500/30 transform rotate-3">
                    <Trophy className="h-7 w-7 text-white" />
                  </div>
                  <div className="absolute -top-1.5 -right-1.5">
                    <Sparkles className="h-4 w-4 text-yellow-400 animate-pulse" />
                  </div>
                </div>

                <div className="relative z-10">
                  <h3 className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    🎉 Onboarding Complete!
                  </h3>
                  <p className="text-muted-foreground mt-1.5 max-w-sm text-sm">
                    <strong className="text-foreground">{newUser.name}</strong> onboarded as <Badge className={cn('px-2 py-0.5 text-xs', getRoleColor(invitedUserInfo.role || ''))}>{invitedUserInfo.role}</Badge>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    ✉️ Invitation link sent for verification.
                  </p>
                </div>

                <div className="flex gap-2 pt-2 relative z-10">
                  <Button variant="outline" className="h-8 px-4 text-sm" onClick={() => {
                    resetInviteDialog();
                    setShowAddUser(false);
                  }}>
                    Close
                  </Button>
                  <Button
                    className="h-8 px-4 gap-2 text-sm bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-lg shadow-blue-500/25"
                    onClick={() => {
                      resetInviteDialog();
                      setShowAddUser(false);
                      handleViewInvitedUsers();
                    }}
                  >
                    <Users className="h-3.5 w-3.5" />
                    View Invited Users
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Error Modal */}
      <Dialog open={inviteErrorModal.open} onOpenChange={(open) => setInviteErrorModal((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              {t('userManagement.inviteError.title')}
            </DialogTitle>
            <DialogDescription>
              {inviteErrorModal.message || t('userManagement.inviteError.defaultMessage')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setInviteErrorModal({ open: false, message: '' })}>
              {t('userManagement.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <InvitationSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onViewInvitedUsers={handleViewInvitedUsers}
        invitedUserName={invitedUserInfo.name}
        invitedUserEmail={invitedUserInfo.email}
        invitedUserRole={invitedUserInfo.role}
      />
    </div>
  );
};