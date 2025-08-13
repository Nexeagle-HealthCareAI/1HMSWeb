import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';

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

  // Use the profile completion hook to get API-based completion percentage
  const { completionPercentage: profileScore } = useProfileCompletion();
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
