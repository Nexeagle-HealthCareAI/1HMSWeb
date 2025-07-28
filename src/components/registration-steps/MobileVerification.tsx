import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone, ArrowLeft, ArrowRight } from 'lucide-react';
import { ValidationUtils } from '@/utils/validation';

interface MobileVerificationProps {
  mobile: string;
  otp: string;
  otpSent: boolean;
  resendTimer: number;
  isLoading: boolean;
  onMobileChange: (mobile: string) => void;
  onOtpChange: (otp: string) => void;
  onSendOTP: () => void;
  onVerifyOTP: () => void;
  onBack: () => void;
  onNext: () => void;
}

export const MobileVerification: React.FC<MobileVerificationProps> = ({
  mobile,
  otp,
  otpSent,
  resendTimer,
  isLoading,
  onMobileChange,
  onOtpChange,
  onSendOTP,
  onVerifyOTP,
  onBack,
  onNext
}) => {
  const [errors, setErrors] = useState<{ mobile?: string; otp?: string }>({});

  // Format mobile number as user types
  const formatMobile = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 3) {
      return cleaned;
    } else if (cleaned.length <= 6) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    }
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatMobile(e.target.value);
    onMobileChange(formatted);
    
    // Clear error when user starts typing
    if (errors.mobile) {
      setErrors(prev => ({ ...prev, mobile: undefined }));
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    onOtpChange(value);
    
    // Clear error when user starts typing
    if (errors.otp) {
      setErrors(prev => ({ ...prev, otp: undefined }));
    }
  };

  const handleSendOTP = () => {
    const cleanMobile = ValidationUtils.cleanMobileNumber(mobile);
    if (!cleanMobile) {
      setErrors(prev => ({ ...prev, mobile: 'Mobile number is required' }));
      return;
    }
    
    if (!ValidationUtils.isValidMobile(cleanMobile)) {
      setErrors(prev => ({ ...prev, mobile: 'Please enter a valid mobile number' }));
      return;
    }
    
    onSendOTP();
  };

  const handleVerifyOTP = () => {
    if (!otp || otp.length !== 6) {
      setErrors(prev => ({ ...prev, otp: 'Please enter a valid 6-digit OTP' }));
      return;
    }
    
    onVerifyOTP();
  };

  // Auto-submit OTP when 6 digits are entered
  useEffect(() => {
    if (otp.length === 6 && otpSent && !isLoading) {
      handleVerifyOTP();
    }
  }, [otp, otpSent, isLoading]);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          Mobile Verification
        </h2>
        <p className="text-sm text-gray-600">
          We'll send a verification code to your mobile number
        </p>
      </div>

      {/* Mobile Number Input */}
      <div className="space-y-2">
        <Label htmlFor="mobile" className="text-sm font-medium">
          Mobile Number
        </Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="mobile"
            type="tel"
            value={mobile}
            onChange={handleMobileChange}
            placeholder="+91-XXX-XXX-XXXX"
            className={`h-10 pl-10 text-sm ${errors.mobile ? 'border-red-500' : ''}`}
            disabled={otpSent || isLoading}
          />
        </div>
        {errors.mobile && (
          <div className="text-xs text-red-600 mt-1">
            {errors.mobile}
          </div>
        )}
      </div>

      {/* Send OTP Button */}
      {!otpSent && (
        <Button
          onClick={handleSendOTP}
          disabled={!mobile || isLoading}
          className="w-full h-10 bg-primary text-white font-medium text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Sending OTP...
            </div>
          ) : (
            'Send OTP'
          )}
        </Button>
      )}

      {/* OTP Input */}
      {otpSent && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="otp" className="text-sm font-medium">
              Enter OTP
            </Label>
            <Input
              id="otp"
              type="text"
              value={otp}
              onChange={handleOtpChange}
              placeholder="Enter 6-digit OTP"
              className={`h-10 text-center tracking-widest text-sm font-mono ${errors.otp ? 'border-red-500' : ''}`}
              maxLength={6}
              disabled={isLoading}
            />
            {errors.otp && (
              <div className="text-xs text-red-600 mt-1">
                {errors.otp}
              </div>
            )}
          </div>

          {/* Resend OTP */}
          <div className="text-center">
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-sm"
              onClick={handleSendOTP}
              disabled={resendTimer > 0 || isLoading}
            >
              {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
            </Button>
          </div>

          {/* Verify OTP Button */}
          <Button
            onClick={handleVerifyOTP}
            disabled={otp.length !== 6 || isLoading}
            className="w-full h-10 bg-primary text-white font-medium text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Verifying...
              </div>
            ) : (
              'Verify OTP'
            )}
          </Button>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-3">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isLoading}
          className="flex-1 h-10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        {otpSent && (
          <Button
            onClick={onNext}
            disabled={isLoading}
            className="flex-1 h-10 bg-primary text-white"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}; 