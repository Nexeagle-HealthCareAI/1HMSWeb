import React from 'react';
import { SharedMobileVerification, SharedMobileVerificationProps } from '@/components/shared';

// Extend the shared props for registration-specific needs
interface RegistrationMobileVerificationProps extends Omit<SharedMobileVerificationProps, 'mode'> {
  // Registration-specific props can be added here if needed
}

export const MobileVerification: React.FC<RegistrationMobileVerificationProps> = (props) => {
  return (
    <SharedMobileVerification
      {...props}
      mode="registration"
      showProgress={true}
      currentStep={2}
      totalSteps={3}
      autoVerify={true}
    />
  );
}; 