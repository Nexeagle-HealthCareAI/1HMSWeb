import React, { useState, useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import { useAuthApi } from '@/hooks/useApi';
import { fetchAndStoreUserPermissions } from '@/features/auth/services/authApi';
import { ValidationUtils } from '@/utils/validation';
import {
  RegistrationLayout,
  UserTypeSelection,
  MobileVerification,
  EmailPasswordSetup
} from '@/features/auth/components';

interface RegistrationProps {
  onRegister: (userRole?: string) => void;
  onSwitchToLogin: () => void;
}

export const Registration: React.FC<RegistrationProps> = ({ onRegister, onSwitchToLogin }) => {
  // Using useAuthApi instead of AuthService
  const registerMutation = useAuthApi.register();
  const sendOTPMutation = useAuthApi.sendOTP();
  const verifyOTPMutation = useAuthApi.verifyOTP();  
  const setPasswordMutation = useAuthApi.setPassword();
  
  // Auth store actions
  const { setToken, setUserId, setUserRole, getUserId, getToken, setAuthenticatedUser } = useAuthStore();
  
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [localUserId, setLocalUserId] = useState<string | null>(null);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [hasVerificationError, setHasVerificationError] = useState(false);
  const [verificationErrorMessage, setVerificationErrorMessage] = useState('');
  const [originalMobile, setOriginalMobile] = useState('');
  const [allowSendOTP, setAllowSendOTP] = useState(true);
  const verificationInProgressRef = useRef(false);

  // Handler to clear verification errors
  const handleClearVerificationError = () => {
    setHasVerificationError(false);
    setVerificationErrorMessage('');
  };

  const handleMobileChange = (value: string) => {
    setMobile(value);
    
    // Enable send OTP if mobile number has changed from original
    if (originalMobile && value !== originalMobile) {
      setAllowSendOTP(true);
    }
  };

  // Helper function to get user-friendly error messages
  const getErrorMessage = (error: any): string => {
    // If it's already a user-friendly message, return it
    if (error instanceof Error && !error.message.includes('Request failed')) {
      return error.message;
    }

    // Handle Axios errors
    if (error?.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          if (data?.message) {
            return data.message;
          }
          return 'Invalid request. Please check your input and try again.';
        case 401:
          return 'Authentication failed. Please try again.';
        case 403:
          return 'Access denied. You don\'t have permission for this action.';
        case 404:
          return 'Resource not found. Please try again.';
        case 422:
          if (data?.message) {
            return data.message;
          }
          return 'Validation failed. Please check your input.';
        case 429:
          return 'Too many requests. Please wait a moment and try again.';
        case 500:
          return 'Server error. Please try again later.';
        case 502:
        case 503:
        case 504:
          return 'Service temporarily unavailable. Please try again later.';
        default:
          return 'Something went wrong. Please try again.';
      }
    }

    // Handle network errors
    if (error?.request) {
      return 'Network error. Please check your connection and try again.';
    }

    // Handle timeout errors
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return 'Request timed out. Please try again.';
    }

    // Handle generic error messages
    if (error?.message) {
      const message = error.message;
      if (message.includes('Request failed with status code 400')) {
        return 'Invalid request. Please check your input and try again.';
      }
      if (message.includes('Request failed with status code 401')) {
        return 'Authentication failed. Please try again.';
      }
      if (message.includes('Request failed with status code 403')) {
        return 'Access denied. You don\'t have permission for this action.';
      }
      if (message.includes('Request failed with status code 404')) {
        return 'Resource not found. Please try again.';
      }
      if (message.includes('Request failed with status code 422')) {
        return 'Validation failed. Please check your input.';
      }
      if (message.includes('Request failed with status code 429')) {
        return 'Too many requests. Please wait a moment and try again.';
      }
      if (message.includes('Request failed with status code 500')) {
        return 'Server error. Please try again later.';
      }
      if (message.includes('Request failed with status code')) {
        return 'Something went wrong. Please try again.';
      }
    }

    // Default fallback
    return 'Something went wrong. Please try again.';
  };

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

  // Monitor otpSent state changes
  useEffect(() => {
    console.log('🔄 otpSent state changed to:', otpSent);
  }, [otpSent]);

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
    setStep(2);
  };

  const handleBackFromStep2 = () => {
    // Reset mobile tracking when going back to step 1
    setOriginalMobile('');
    setAllowSendOTP(true);
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
    setStep(3); // Go to email/password setup
  };

  const handleBackFromStep3 = () => {
    // Store the current mobile as original and disable send OTP
    setOriginalMobile(mobile);
    setAllowSendOTP(false);
    setStep(2);
  };

  const handleNextFromStep3 = () => {
    // Email/password setup is optional, can proceed to completion
    onRegister(userType === 'Admin Only' ? 'Admin' : 'AdminDoctor');
  };

  // Map user type to role for API
  const getUserRole = (userType: string): string => {
    switch (userType) {
      case 'Admin Only':
        return 'Admin';
      case 'Doctor & Admin':
        return 'AdminDoctor';      
    }
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

    try {
      // Step 1: Call register API first
      const role = getUserRole(userType);
      
      const signUpResponse = await registerMutation.mutateAsync({
        mobileNumber: cleanMobile,
        roles: role
      });
      
      console.log('📋 Full registration response:', signUpResponse);    
      
      // Check if registration was successful
      if (!signUpResponse.success) {        
        throw new Error(signUpResponse.message || 'Registration failed');
      }   
    
      
      if (signUpResponse.userId) {
        console.log('🔑 Storing userId from registration:', signUpResponse.userId);
        setUserId(signUpResponse.userId);
        setLocalUserId(signUpResponse.userId);
        console.log('🔍 After setUserId - userId from store:', getUserId());
      }
      
      // Store token if available
      if (signUpResponse.accessToken) {
        setToken(signUpResponse.accessToken);
      }    
      
      const otpResponse = await sendOTPMutation.mutateAsync({ mobileNumber: cleanMobile });
      console.log('✅ SendOTP API response:', otpResponse);
      
      if (!otpResponse.success) {
        throw new Error(otpResponse.message || 'Failed to send OTP');
      }      
      setOtpSent(true);      
      setResendTimer(30);
      // Reset mobile tracking after successful OTP send
      setOriginalMobile('');
      setAllowSendOTP(true);     
      
      toast({
        title: "Registration & OTP Sent!",
        description: "Registration successful! Please check your mobile for the verification code"
      });
    } catch (error) {
      console.error('❌ Error in sendOTP flow:', error);
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive"
      });
    }
  };

  const resendOTP = async () => {
    
    const cleanMobile = ValidationUtils.cleanMobileNumber(mobile);
    if (!cleanMobile) {
      toast({
        title: "Invalid Mobile",
        description: "Please enter a valid mobile number",
        variant: "destructive"
      });
      return;
    }

    try {
      
      const otpResponse = await sendOTPMutation.mutateAsync({ mobileNumber: cleanMobile });     
      
      if (!otpResponse.success) {
        throw new Error(otpResponse.message || 'Failed to resend OTP');
      }
      
      setResendTimer(30);     
      
      toast({
        title: "OTP Resent!",
        description: "Please check your mobile for the new verification code"
      });
    } catch (error) {
      console.error('Error in resendOTP:', error);
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive"
      });
    }
  };

  const verifyOTP = async () => {    
    
    if (verificationInProgressRef.current) {      
      return;
    }

    const cleanMobile = ValidationUtils.cleanMobileNumber(mobile);
    const cleanOtp = otp.replace(/\D/g, '');

    if (!cleanOtp || cleanOtp.length !== 6) {     
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive"
      });
      return;
    }    
    verificationInProgressRef.current = true;
    setIsVerifyingOTP(true);

    try {      
      // Step 3: Call verifyOTP API     
      const response = await verifyOTPMutation.mutateAsync({
        mobileNumber: cleanMobile,
        otp: cleanOtp
      });
      
      console.log('📋 Full OTP verification response:', response);   
      

      if (response.success) {
        // Store userId from verifyOTP response if available
        if (response.userId) {
          console.log('🔑 Storing userId from OTP verification:', response.userId);
          setUserId(response.userId);
          setLocalUserId(response.userId);
          console.log('🔍 After setUserId from OTP - userId from store:', getUserId());
        }
        
        // Store accessToken from verifyOTP response
        if (response.accessToken) {
          console.log('🔑 Storing accessToken from OTP verification:', response.accessToken);
          setToken(response.accessToken);
        }
        
        toast({
          title: "OTP Verified!",
          description: "Mobile number verified successfully"
        });
        setStep(3);
      } else {
        throw new Error(response.message || 'OTP verification failed');
      }
    } catch (error) {      
      const errorMessage = getErrorMessage(error);
      setHasVerificationError(true);
      setVerificationErrorMessage(errorMessage);
      toast({
        title: "OTP Verification Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {      
      setIsVerifyingOTP(false);
      verificationInProgressRef.current = false;
    }
  };

  const handleFinalStep = async () => {
    const userId = getUserId();
    console.log('🔍 handleFinalStep - userId from store:', userId);
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found. Please try again from the beginning.",
        variant: "destructive"
      });
      return;
    }
  };

  const handleEmailPasswordSetup = async () => {
    const userId = getUserId();
    console.log('🔍 handleEmailPasswordSetup - userId from store:', userId);
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found. Please try again from the beginning.",
        variant: "destructive"
      });
      return;
    }

    try {
      const setPasswordData = {
        userId: userId,
        email: email.trim(),
        password: password.trim()
      };

      const response = await setPasswordMutation.mutateAsync(setPasswordData);
      
      if (response.success) {
        // Properly authenticate the user after successful registration
        const userRole = userType === 'Admin Only' ? 'Admin' : 'AdminDoctor';
        const token = getToken();
        if (userId && token) {
          setAuthenticatedUser(userId, token);
          
          // Fetch and store user permissions
          try {
            await fetchAndStoreUserPermissions(userId, token);
          } catch (error) {
            console.error('Failed to fetch permissions:', error);
            // Continue with registration even if permissions fetch fails
          }
        }
        
        toast({
          title: "Account Setup Complete!",
          description: "Your email and password have been set successfully"
        });
        onRegister(userRole); // Complete registration directly
      } else {
        throw new Error(response.message || 'Failed to set password');
      }
    } catch (error) {
      console.error('Error in handleEmailPasswordSetup:', error);
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive"
      });
    }
  };

  const handleSkipEmailPassword = async () => {
    // Skip email/password setup and complete registration directly
    const userRole = userType === 'Admin Only' ? 'Admin' : 'AdminDoctor';
    const userId = getUserId();
    const token = getToken();
    if (userId && token) {
      setAuthenticatedUser(userId, token);
      
      // Fetch and store user permissions
      try {
        await fetchAndStoreUserPermissions(userId, token);
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
        // Continue with registration even if permissions fetch fails
      }
    }
    onRegister(userRole);
  };

  const handleSkip = async () => {
    const userId = getUserId();
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not found. Please try again from the beginning.",
        variant: "destructive"
      });
      return;
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
            isLoading={registerMutation.isPending || sendOTPMutation.isPending}
          />
        );
      case 2:
        console.log('🎨 Rendering step 2 with otpSent:', otpSent, 'mobile:', mobile, 'otp:', otp);
        return (
          <MobileVerification
            mobile={mobile}
            otp={otp}
            otpSent={otpSent}
            resendTimer={resendTimer}
            isLoading={registerMutation.isPending || sendOTPMutation.isPending || verifyOTPMutation.isPending}
            onMobileChange={handleMobileChange}
            onOtpChange={setOtp}
            onSendOTP={sendOTP}
            onResendOTP={resendOTP}
            onVerifyOTP={verifyOTP}
            onClearVerificationError={handleClearVerificationError}
            hasVerificationError={hasVerificationError}
            verificationErrorMessage={verificationErrorMessage}
            originalMobile={originalMobile}
            allowSendOTP={allowSendOTP}
            onBack={handleBackFromStep2}
            onNext={handleNextFromStep2}
          />
        );
      case 3:
        return (
          <EmailPasswordSetup
            email={email}
            password={password}
            isLoading={setPasswordMutation.isPending}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onComplete={handleEmailPasswordSetup}
            onSkip={handleSkipEmailPassword}
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
      onBack={
        step === 2 ? handleBackFromStep2 : 
        step === 3 ? handleBackFromStep3 : 
        undefined
      }
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
              disabled={registerMutation.isPending || sendOTPMutation.isPending || verifyOTPMutation.isPending || setPasswordMutation.isPending}
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </RegistrationLayout>
  );
};