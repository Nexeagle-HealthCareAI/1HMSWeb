import { useState, useEffect, useCallback, useMemo } from 'react';
// import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { useHospitalApi } from '@/hooks/useApi';
import { HospitalBranding } from '../components/HospitalBrandingConfig';

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
  registrationNumber: ''
};

export const useSystemConfiguration = (focusTab?: string) => {
  const getInitialTab = () => {
    return 'branding';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [hospitalBranding, setHospitalBranding] = useState<HospitalBranding>(defaultBranding);

  // Update active tab when focusTab changes
  useEffect(() => {
    if (focusTab) {
      const newTab = getInitialTab();
      setActiveTab(newTab);
    }
  }, [focusTab]);

  const { hospitalId } = useAuthStore();

  // Fetch hospital data to get registration date
  const { data: hospitalData, isLoading: isHospitalLoading } = useHospitalApi.getHospitalById(hospitalId || '');

  // Calculate trial status
  const trialStatus = useMemo(() => {
    if (!hospitalData?.createdAt) {
      return {
        daysRemaining: 0,
        isTrialActive: false,
        trialEndDate: null
      };
    }

    const registrationDate = new Date(hospitalData.createdAt);
    const trialEndDate = new Date(registrationDate);
    trialEndDate.setMonth(trialEndDate.getMonth() + 3); // 3 months trial

    const today = new Date();
    const timeDiff = trialEndDate.getTime() - today.getTime();
    const daysRemaining = Math.max(0, Math.ceil(timeDiff / (1000 * 3600 * 24)));
    const isTrialActive = daysRemaining > 0;

    return {
      daysRemaining,
      isTrialActive,
      trialEndDate,
      trialStartDate: registrationDate
    };
  }, [hospitalData?.createdAt]);

  const handleBrandingChange = useCallback((updatedBranding: HospitalBranding) => {
    setHospitalBranding(updatedBranding);
    // toast removed temporarily
  }, []);

  return {
    activeTab,
    setActiveTab,
    hospitalBranding,
    handleBrandingChange,
    ...trialStatus,
    isHospitalLoading
  };
};
