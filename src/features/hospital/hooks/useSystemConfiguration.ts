import { useState, useEffect, useCallback } from 'react';
// import { useToast } from '@/hooks/use-toast';
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
  // Map focusTab to the correct tab value
  const getInitialTab = () => {
    if (focusTab === 'hospital') return 'branding';
    if (focusTab === 'subscription') return 'subscription';
    return 'subscription'; // Default to subscription tab
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

  const handleBrandingChange = useCallback((updatedBranding: HospitalBranding) => {
    setHospitalBranding(updatedBranding);
    // toast removed temporarily
  }, []);

  return {
    activeTab,
    setActiveTab,
    hospitalBranding,
    handleBrandingChange
  };
};
