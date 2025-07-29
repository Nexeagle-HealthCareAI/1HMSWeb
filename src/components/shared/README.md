# Shared Components

This directory contains reusable components that can be used across different parts of the application.

## SharedMobileVerification

A reusable mobile verification component that handles mobile number input, OTP sending, and OTP verification.

### Features

- **Mobile number formatting** - Automatically formats mobile numbers as user types
- **OTP input and validation** - Handles 6-digit OTP input with validation
- **Auto-verification** - Can automatically verify OTP when 6 digits are entered
- **Resend functionality** - Built-in resend OTP with timer
- **Progress indicator** - Optional progress bar for multi-step flows
- **Customizable UI** - Configurable titles, button texts, and styling
- **Multiple modes** - Supports registration, login, and forgot-password flows

### Usage

```tsx
import { SharedMobileVerification } from '@/components/shared';

// Basic usage
<SharedMobileVerification
  mobile={mobile}
  otp={otp}
  otpSent={otpSent}
  resendTimer={resendTimer}
  isLoading={isLoading}
  onMobileChange={setMobile}
  onOtpChange={setOtp}
  onSendOTP={handleSendOTP}
  onResendOTP={handleResendOTP}
  onVerifyOTP={handleVerifyOTP}
/>

// With custom configuration
<SharedMobileVerification
  mobile={mobile}
  otp={otp}
  otpSent={otpSent}
  resendTimer={resendTimer}
  isLoading={isLoading}
  onMobileChange={setMobile}
  onOtpChange={setOtp}
  onSendOTP={handleSendOTP}
  onResendOTP={handleResendOTP}
  onVerifyOTP={handleVerifyOTP}
  mode="registration"
  autoVerify={true}
  showProgress={true}
  currentStep={2}
  totalSteps={3}
  title="Verify Your Mobile"
  subtitle="Enter your mobile number to receive a verification code"
  sendButtonText="Send Code"
  verifyButtonText="Verify Code"
  resendButtonText="Resend Code"
/>
```

### Props

#### Required Props
- `mobile` - Current mobile number value
- `otp` - Current OTP value
- `otpSent` - Whether OTP has been sent
- `resendTimer` - Countdown timer for resend (0 = can resend)
- `isLoading` - Loading state
- `onMobileChange` - Callback when mobile number changes
- `onOtpChange` - Callback when OTP changes
- `onSendOTP` - Callback to send OTP
- `onResendOTP` - Callback to resend OTP
- `onVerifyOTP` - Callback to verify OTP

#### Optional Props
- `onBack` - Callback for back navigation (shows Back button when provided)
- `onNext` - Callback for next navigation (shows Next button when provided)
- `mode` - 'registration' | 'login' | 'forgot-password' (default: 'registration')
- `autoVerify` - Whether to auto-verify when 6 digits entered (default: true)
- `mobileDisabled` - Whether mobile input is disabled (default: false)
- `showProgress` - Whether to show progress indicator (default: false)
- `currentStep` - Current step number for progress (default: 2)
- `totalSteps` - Total steps for progress (default: 3)
- `title` - Custom title text
- `subtitle` - Custom subtitle text
- `sendButtonText` - Custom send button text (default: 'Send OTP')
- `verifyButtonText` - Custom verify button text (default: 'Verify OTP')
- `resendButtonText` - Custom resend button text (default: 'Resend OTP')
- `className` - Additional CSS classes

### Integration Examples

The component is currently used in:
- Registration flow (`src/components/registration-steps/MobileVerification.tsx`)
- OTP Login (`src/components/login/OTPLoginForm.tsx`)
- Forgot Password (`src/components/login/ForgotPasswordForm.tsx`)