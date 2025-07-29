import React, { useState, useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AuthService } from '@/services/authService';
import { ValidationUtils } from '@/utils/validation';
import {
  RegistrationLayout,
  UserTypeSelection,
  MobileVerification,
  ProfileCompletion
} from '@/components/registration-steps';

interface RegistrationProps {
  onRegister: () => void;
  onSwitchToLogin: () => void;
}

export const Registration: React.FC<RegistrationProps> = ({ onRegister, onSwitchToLogin }) => {
  const { sendOTP: authSendOTP } = useAuth();
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const verificationInProgressRef = useRef(false);

  // Resend timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  // Handler functions for child components
  const handleUserTypeSelection = (type: string) => {
    setUserType(type);
  };

  const handleNextFromStep1 = (selectedType?: string) => {
    console.log('handleNextFromStep1 called with selectedType:', selectedType, 'current userType:', userType);
    const typeToCheck = selectedType || userType;
    console.log('Type to check:', typeToCheck);
    
    if (!typeToCheck) {
      console.log('No type selected, showing error toast');
      toast({
        title: "Selection Required",
        description: "Please select a user type to continue",
        variant: "destructive"
      });
      return;
    }
    // If selectedType is provided, update the state
    if (selectedType && selectedType !== userType) {
      console.log('Updating userType from', userType, 'to', selectedType);
      setUserType(selectedType);
    }
    console.log('Proceeding to step 2 with type:', typeToCheck);
    setStep(2);
  };

  const handleBackFromStep2 = () => {
    setStep(1);
  };

  const handleNextFromStep2 = () => {
    if (!otpSent) {
      toast({
        title: "OTP Required",
        description: "Please send and verify OTP to continue",
        variant: "destructive"
      });
      return;
    }
    setStep(3);
  };

  const handleBackFromStep3 = () => {
    setStep(2);
  };

  const sendOTP = async () => {
    const cleanMobile = ValidationUtils.cleanMobileNumber(mobile);
    if (!cleanMobile) {
      toast({
        title: "Invalid Mobile",
        description: "Please enter a valid mobile number",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // First call signup API to register user and get userId
      const signUpResponse = await AuthService.signUp(cleanMobile, userType);
      console.log('Sign up response:', signUpResponse);
      
      if (signUpResponse.success && signUpResponse.userId) {
        setUserId(signUpResponse.userId);
        console.log('UserId stored from signup:', signUpResponse.userId);
      }

      // Then call OTP generator API
      await authSendOTP(cleanMobile);
      setOtpSent(true);
      setResendTimer(30);
      
      toast({
        title: "OTP Sent!",
        description: "Please check your mobile for the verification code"
      });
    } catch (error) {
      console.error('Error in sendOTP:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send OTP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resendOTP = async () => {
    console.log('=== RESEND OTP CALLED ===');
    const cleanMobile = ValidationUtils.cleanMobileNumber(mobile);
    if (!cleanMobile) {
      toast({
        title: "Invalid Mobile",
        description: "Please enter a valid mobile number",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Resending OTP for mobile:', cleanMobile);
      // Only call OTP generator API for resend (no signup needed)
      await authSendOTP(cleanMobile);
      setResendTimer(30);
      
      console.log('OTP resent successfully');
      toast({
        title: "OTP Resent!",
        description: "Please check your mobile for the new verification code"
      });
    } catch (error) {
      console.error('Error in resendOTP:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resend OTP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    console.log('=== VERIFY OTP CALLED ===');
    console.log('Current state:', { 
      verificationInProgress: verificationInProgressRef.current,
      isLoading,
      otpLength: otp.length,
      otpSent,
      step
    });
    
    if (verificationInProgressRef.current) {
      console.log('OTP verification already in progress, skipping...');
      return;
    }

    const cleanMobile = ValidationUtils.cleanMobileNumber(mobile);
    const cleanOtp = otp.replace(/\D/g, '');

    if (!cleanOtp || cleanOtp.length !== 6) {
      console.log('Invalid OTP, not proceeding with verification');
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive"
      });
      return;
    }

    console.log('Starting OTP verification...');
    verificationInProgressRef.current = true;
    setIsVerifyingOTP(true);
    setIsLoading(true);

    try {
      console.log('Verifying OTP with:', { cleanMobile, cleanOtp, userId });
      const response = await AuthService.checkOTP(cleanMobile, cleanOtp);
      console.log('OTP verification response:', response);

      if (response.success) {
        console.log('OTP verification successful, moving to step 3');
        toast({
          title: "OTP Verified!",
          description: "Mobile number verified successfully"
        });
        setStep(3);
      } else {
        throw new Error(response.message || 'OTP verification failed');
      }
    } catch (error) {
      console.error('Error in verifyOTP:', error);
      toast({
        title: "OTP Verification Failed",
        description: error instanceof Error ? error.message : "Please check your OTP and try again",
        variant: "destructive"
      });
    } finally {
      console.log('OTP verification completed, resetting flags');
      setIsVerifyingOTP(false);
      setIsLoading(false);
      verificationInProgressRef.current = false;
    }
  };

  const handleFinalStep = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found. Please try again from the beginning.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const profileData = {
        userId: userId,
        email: email.trim(),
        password: password.trim(),
        fullName: '', // Removed fullName
        gender: '', // Removed gender
        language: '', // Removed language
        profilePictureUrl: ''
      };

      console.log('Updating user profile with:', profileData);
      await AuthService.updateUserProfile(profileData);
      
      toast({
        title: "Registration Complete!",
        description: "Welcome to NexEagle easyHMS"
      });
      
      onRegister();
    } catch (error) {
      console.error('Error in handleFinalStep:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete registration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found. Please try again from the beginning.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const profileData = {
        userId: userId,
        email: '',
        password: '',
        fullName: '', // Removed fullName
        gender: '', // Removed gender
        language: '', // Removed language
        profilePictureUrl: ''
      };

      console.log('Skipping profile completion with:', profileData);
      await AuthService.updateUserProfile(profileData);
      
      toast({
        title: "Registration Complete!",
        description: "Welcome to NexEagle easyHMS"
      });
      
      onRegister();
    } catch (error) {
      console.error('Error in handleSkip:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete registration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Determine current step content
  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return (
          <UserTypeSelection
            selectedType={userType}
            onSelectType={handleUserTypeSelection}
            onNext={handleNextFromStep1}
            isLoading={isLoading}
          />
        );
      case 2:
        return (
          <MobileVerification
            mobile={mobile}
            otp={otp}
            otpSent={otpSent}
            resendTimer={resendTimer}
            isLoading={isLoading}
            onMobileChange={setMobile}
            onOtpChange={setOtp}
            onSendOTP={sendOTP}
            onResendOTP={resendOTP}
            onVerifyOTP={verifyOTP}
            onBack={handleBackFromStep2}
            onNext={handleNextFromStep2}
          />
        );
      case 3:
        return (
          <ProfileCompletion
            email={email}
            password={password}
            isLoading={isLoading}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onComplete={handleFinalStep}
            onSkip={handleSkip}
            onBack={handleBackFromStep3}
          />
        );
      default:
        return null;
    }
  };

  return (
    <RegistrationLayout
      currentStep={step}
      onBack={step === 2 ? handleBackFromStep2 : step === 3 ? handleBackFromStep3 : undefined}
      onSwitchToLogin={onSwitchToLogin}
    >
      <div className="space-y-6">
        {/* Current Step Content */}
        {renderCurrentStep()}
        
        {/* Login Link */}
        <div className="text-center pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-primary hover:underline font-medium"
              disabled={isLoading}
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </RegistrationLayout>
  );
};