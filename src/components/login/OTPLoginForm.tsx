import React, { useState, useEffect } from 'react';
import { Phone, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ValidationUtils } from '@/utils/validation';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) {
      return;
    }

    const sanitizedMobile = ValidationUtils.sanitizeInput(mobile);
    if (!sanitizedMobile || !ValidationUtils.isValidMobile(sanitizedMobile)) {
      return;
    }

    if (!isOtpSent) {
      await onSendOTP(sanitizedMobile);
      setIsOtpSent(true);
      setOtpTimer(30);
      return;
    }

    const sanitizedOtp = ValidationUtils.sanitizeInput(otp);
    if (!sanitizedOtp || !ValidationUtils.isValidOTP(sanitizedOtp)) {
      return;
    }

    await onVerifyOTP(sanitizedMobile, sanitizedOtp);
  };

  const resendOtp = async () => {
    if (otpTimer > 0) return;
    
    const sanitizedMobile = ValidationUtils.sanitizeInput(mobile);
    if (!ValidationUtils.checkRateLimit(`resend_otp_${sanitizedMobile}`, 3, 5 * 60 * 1000)) {
      return;
    }
    
    try {
      await onSendOTP(sanitizedMobile);
      setOtpTimer(30);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="mobile" className="text-sm font-medium">
          Mobile Number
        </Label>
        <div className="relative">
          <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="mobile"
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(ValidationUtils.sanitizeInput(e.target.value))}
            placeholder="+91-XXXXXXXXXX"
            className="h-12 pl-12 text-base"
            disabled={isOtpSent || isLoading || isLocked}
          />
        </div>
      </div>
      
      {isOtpSent && (
        <div className="space-y-2">
          <Label htmlFor="otp" className="text-sm font-medium">
            Enter OTP
          </Label>
          <Input
            id="otp"
            type="text"
            value={otp}
            onChange={(e) => setOtp(ValidationUtils.sanitizeInput(e.target.value))}
            placeholder="Enter 6-digit OTP"
            className="h-12 text-center tracking-widest text-base font-mono"
            maxLength={6}
            disabled={isLoading || isLocked}
          />
          <div className="flex justify-between items-center">
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={resendOtp}
              disabled={otpTimer > 0 || isLoading || isLocked}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {otpTimer > 0 ? `Resend OTP (${otpTimer}s)` : 'Resend OTP'}
            </Button>
          </div>
        </div>
      )}

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

      <Button 
        type="submit" 
        className="w-full h-12 bg-gradient-primary text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
        disabled={isLoading || isLocked}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Processing...
          </div>
        ) : (
          isOtpSent ? "Verify & Login" : "Send OTP"
        )}
      </Button>
    </form>
  );
}; 