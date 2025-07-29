import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SharedMobileVerification } from '@/components/shared';

interface OTPLoginFormProps {
  onSendOTP: (mobile: string) => Promise<void>;
  onVerifyOTP: (mobile: string, otp: string) => Promise<void>;
  onSwitchToPassword: () => void;
  isLoading: boolean;
  isLocked: boolean;
  lockoutTimeRemaining: number;
}

export const OTPLoginForm: React.FC<OTPLoginFormProps> = ({
  onSendOTP,
  onVerifyOTP,
  onSwitchToPassword,
  isLoading,
  isLocked,
  lockoutTimeRemaining
}) => {
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  // OTP timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [otpTimer]);

  const handleSendOTP = async () => {
    try {
      await onSendOTP(mobile);
      setIsOtpSent(true);
      setOtpTimer(30);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleResendOTP = async () => {
    try {
      await onSendOTP(mobile);
      setOtpTimer(30);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleVerifyOTP = async () => {
    try {
      await onVerifyOTP(mobile, otp);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  return (
    <div className="space-y-4">
      <SharedMobileVerification
        mobile={mobile}
        otp={otp}
        otpSent={isOtpSent}
        resendTimer={otpTimer}
        isLoading={isLoading}
        onMobileChange={setMobile}
        onOtpChange={setOtp}
        onSendOTP={handleSendOTP}
        onResendOTP={handleResendOTP}
        onVerifyOTP={handleVerifyOTP}
        mode="login"
        mobileDisabled={isLocked}
        autoVerify={true} // Enable auto-verification for login
        className="mb-4"
      />

      {/* Back to Password Login */}
      <div className="flex justify-start">
        <Button
          type="button"
          variant="link"
          className="p-0 h-auto text-sm text-primary"
          onClick={() => {
            onSwitchToPassword();
            setIsOtpSent(false);
            setMobile('');
            setOtp('');
          }}
          disabled={isLoading || isLocked}
        >
          ← Back to Password Login
        </Button>
      </div>
    </div>
  );
}; 