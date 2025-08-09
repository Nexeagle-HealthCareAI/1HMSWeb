import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';

export const useAdminDashboard = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showProfilePage, setShowProfilePage] = useState(false);
  const { toast } = useToast();

  const authStore = useAuthStore.getState();
  const userRole = authStore.getUserRole() || 'admin';

  // Calculate hospital registration completion score
  const calculateHospitalCompletionScore = (): number => {
    // TODO: Move setup data to Zustand store
    const setupData = null;
    const hasCompleted = null;
    
    if (hasCompleted) return 100;
    
    if (!setupData) return 0;
    
    const data = JSON.parse(setupData);
    
    const hospitalFields = [
      data.hospital?.name,
      data.hospital?.phone,
      data.hospital?.registrationNumber,
      data.hospital?.address,
      data.hospital?.email,
    ];
    
    const completed = hospitalFields.filter(field => field && field.toString().trim() !== '').length;
    return Math.round((completed / hospitalFields.length) * 100);
  };

  // Calculate profile completion score for admin/doctor
  const calculateProfileScore = (): number => {
    // TODO: Move setup data to Zustand store
    const setupData = null;
    const hasCompleted = null;
    
    if (hasCompleted) return 100;
    
    if (!setupData) return 20;
    
    const data = JSON.parse(setupData);
    
    let requiredFields = [
      data.hospital?.name,
      data.hospital?.phone,
      data.hospital?.registrationNumber,
      data.hospital?.address,
    ];

    // Add doctor fields only if user is a doctor
    if (userRole === 'doctor' || userRole === 'admin-doctor') {
      requiredFields = requiredFields.concat([
        data.doctor?.fullName,
        data.doctor?.specialization,
        data.doctor?.licenseNumber,
        data.doctor?.qualification,
      ]);
    }
    
    const optionalFields = [
      data.hospital?.email,
      data.doctor?.email,
      data.doctor?.experience,
      data.documents?.license,
      data.documents?.signature,
      data.documents?.clinicPhotos?.length > 0,
    ];
    
    const requiredComplete = requiredFields.filter(field => field && field.toString().trim() !== '').length;
    const optionalComplete = optionalFields.filter(field => field).length;
    
    const requiredWeight = 70;
    const optionalWeight = 30;
    
    const requiredProgress = (requiredComplete / requiredFields.length) * requiredWeight;
    const optionalProgress = (optionalComplete / optionalFields.length) * optionalWeight;
    
    return Math.round(requiredProgress + optionalProgress);
  };

  const profileScore = calculateProfileScore();
  const hospitalScore = calculateHospitalCompletionScore();

  const handleModuleClick = (moduleId: string) => {
    const isLocked = hospitalScore < 70 && moduleId !== 'dashboard' && moduleId !== 'system-config';
    
    if (isLocked) {
      toast({
        title: "Feature Locked",
        description: "Complete hospital registration to unlock this feature.",
        variant: "destructive"
      });
    } else {
      setCurrentView(moduleId);
    }
  };

  const handleProfileSetup = () => {
    setShowProfilePage(true);
  };

  const handleHospitalSetup = () => {
    setCurrentView('system-config');
  };

  const dismissBanner = () => {
    setBannerDismissed(true);
  };

  const closeSetupDialog = () => {
    setShowSetupDialog(false);
  };

  const openSetupDialog = () => {
    setShowSetupDialog(true);
  };

  return {
    currentView,
    setCurrentView,
    showSetupDialog,
    setShowSetupDialog,
    bannerDismissed,
    setBannerDismissed,
    showProfilePage,
    setShowProfilePage,
    userRole,
    profileScore,
    hospitalScore,
    handleModuleClick,
    handleProfileSetup,
    handleHospitalSetup,
    dismissBanner,
    closeSetupDialog,
    openSetupDialog
  };
};
