import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Shield, Stethoscope, Phone, Mail, RefreshCw, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ValidationUtils } from '@/utils/validation';

interface LoginProps {
  onLogin: () => void;
  onSwitchToRegister: () => void;
}

export const SecureLogin: React.FC<LoginProps> = ({ onLogin, onSwitchToRegister }) => {
  const { login, loginWithOTP, sendOTP, forgotPasswordSendOTP, resetPassword } = useAuth();
  const [loginType, setLoginType] = useState('password');
  
  // Main login fields with sanitization
  const [userid, setUserid] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // OTP login fields
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  
  // Forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotMobile, setForgotMobile] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1);
  
  // Security states
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [forgotOtpTimer, setForgotOtpTimer] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimeRemaining, setLockoutTimeRemaining] = useState(0);
  const [passwordStrength, setPasswordStrength] = useState<{ isValid: boolean; strength: 'weak' | 'medium' | 'strong'; errors: string[] }>({ isValid: false, strength: 'weak', errors: [] });

  // Check for account lockout and handle countdown
  useEffect(() => {
    const lockoutUntil = localStorage.getItem('accountLockout');
    if (lockoutUntil && Date.now() < parseInt(lockoutUntil)) {
      setIsLocked(true);
      const remainingTime = Math.ceil((parseInt(lockoutUntil) - Date.now()) / 1000);
      setLockoutTimeRemaining(remainingTime);
      
      if (remainingTime > 0) {
        toast({
          title: "Account Temporarily Locked",
          description: `Too many failed attempts. Try again in ${Math.ceil(remainingTime / 60)} minutes.`,
          variant: "destructive"
        });
      }
    } else {
      // Clear lockout if expired
      localStorage.removeItem('accountLockout');
      setIsLocked(false);
      setLockoutTimeRemaining(0);
      setFailedAttempts(0);
    }
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLocked && lockoutTimeRemaining > 0) {
      interval = setInterval(() => {
        setLockoutTimeRemaining(prev => {
          if (prev <= 1) {
            // Lockout expired
            localStorage.removeItem('accountLockout');
            setIsLocked(false);
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isLocked, lockoutTimeRemaining]);

  // Password strength validation
  useEffect(() => {
    if (newPassword) {
      setPasswordStrength(ValidationUtils.validatePassword(newPassword));
    }
  }, [newPassword]);

  const handleMobileLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    //if user had enetered multiple times
    if (isLocked) {
      const minutes = Math.floor(lockoutTimeRemaining / 60);
      const seconds = lockoutTimeRemaining % 60;
      toast({
        title: "Account Locked",
        description: `Too many failed attempts. Please try again in ${minutes}:${seconds.toString().padStart(2, '0')}`,
        variant: "destructive"
      });
      return;
    }

    const sanitizedMobile = ValidationUtils.sanitizeInput(mobile);
    if (!sanitizedMobile || !ValidationUtils.isValidMobile(sanitizedMobile)) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid mobile number",
        variant: "destructive"
      });
      return;
    }

    if (!isOtpSent) {
      // Rate limiting for OTP requests
      if (!ValidationUtils.checkRateLimit(`otp_${sanitizedMobile}`, 3, 5 * 60 * 1000)) {
        toast({
          title: "Rate Limit Exceeded",
          description: "Too many OTP requests. Please wait 5 minutes.",
          variant: "destructive"
        });
        return;
      }

      setIsLoading(true);
      try {
        await sendOTP(sanitizedMobile);
        setIsOtpSent(true);
        toast({
          title: "OTP Sent!",
          description: "Please check your mobile for the verification code"
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to send OTP. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const sanitizedOtp = ValidationUtils.sanitizeInput(otp);
    if (!sanitizedOtp || !ValidationUtils.isValidOTP(sanitizedOtp)) {
      toast({
        title: "Invalid OTP",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await loginWithOTP(sanitizedMobile, sanitizedOtp);
      ValidationUtils.clearRateLimit(`otp_${sanitizedMobile}`);
      setFailedAttempts(0);
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to NexEagle easyHMS"
      });
      onLogin();
    } catch (error) {
      handleFailedLogin();
      toast({
        title: "Login Failed",
        description: "Invalid OTP. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) {
      const minutes = Math.floor(lockoutTimeRemaining / 60);
      const seconds = lockoutTimeRemaining % 60;
      toast({
        title: "Account Locked",
        description: `Too many failed attempts. Please try again in ${minutes}:${seconds.toString().padStart(2, '0')}`,
        variant: "destructive"
      });
      return;
    }

    const sanitizedUserid = ValidationUtils.sanitizeInput(userid);
    const sanitizedPassword = ValidationUtils.sanitizeInput(password);

    if (!sanitizedUserid || !sanitizedPassword) {
      toast({
        title: "Invalid Input",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    // Validate email/mobile format
    const isEmail = ValidationUtils.isValidEmail(sanitizedUserid);
    const isMobile = ValidationUtils.isValidMobile(sanitizedUserid);
    
    if (!isEmail && !isMobile) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid email or mobile number",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await login(sanitizedUserid, sanitizedPassword);
      ValidationUtils.clearRateLimit('login_attempts');
      setFailedAttempts(0);
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to NexEagle easyHMS"
      });
      onLogin();
    } catch (error) {
      handleFailedLogin();
      toast({
        title: "Login Failed",
        description: "Invalid credentials. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFailedLogin = () => {
    setFailedAttempts(prev => {
      const newAttempts = prev + 1;
      
             // Lock account after 5 failed attempts for 1 minute
       if (newAttempts >= 5) {
         const lockoutUntil = Date.now() + (1 * 60 * 1000); // 1 minute lockout
        localStorage.setItem('accountLockout', lockoutUntil.toString());
        setIsLocked(true);
        setLockoutTimeRemaining(60); // 60 seconds
        
        toast({
          title: "Account Locked",
          description: "Too many failed attempts. Account locked for 1 minute.",
          variant: "destructive"
        });
      }
      
      return newAttempts;
    });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (forgotStep === 1) {
      const sanitizedMobile = ValidationUtils.sanitizeInput(forgotMobile);
      if (!sanitizedMobile || !ValidationUtils.isValidMobile(sanitizedMobile)) {
        toast({
          title: "Invalid Input",
          description: "Please enter a valid mobile number",
          variant: "destructive"
        });
        return;
      }

      // Rate limiting for forgot password OTP
      if (!ValidationUtils.checkRateLimit(`forgot_otp_${sanitizedMobile}`, 2, 10 * 60 * 1000)) {
        toast({
          title: "Rate Limit Exceeded",
          description: "Too many password reset requests. Please wait 10 minutes.",
          variant: "destructive"
        });
        return;
      }

      setIsLoading(true);
      try {
        await forgotPasswordSendOTP(sanitizedMobile);
        setForgotStep(2);
        toast({
          title: "OTP Sent!",
          description: "Please check your mobile for the verification code"
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to send OTP. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    } else if (forgotStep === 2) {
      const sanitizedOtp = ValidationUtils.sanitizeInput(forgotOtp);
      if (!sanitizedOtp || !ValidationUtils.isValidOTP(sanitizedOtp)) {
        toast({
          title: "Invalid OTP",
          description: "Please enter a valid 6-digit OTP",
          variant: "destructive"
        });
        return;
      }
      setForgotStep(3);
    } else {
      const sanitizedNewPassword = ValidationUtils.sanitizeInput(newPassword);
      const sanitizedConfirmPassword = ValidationUtils.sanitizeInput(confirmPassword);

      if (!sanitizedNewPassword || !sanitizedConfirmPassword) {
        toast({
          title: "Invalid Input",
          description: "Please fill in all fields",
          variant: "destructive"
        });
        return;
      }

      if (sanitizedNewPassword !== sanitizedConfirmPassword) {
        toast({
          title: "Passwords Don't Match",
          description: "New password and confirm password must match",
          variant: "destructive"
        });
        return;
      }

      if (!passwordStrength.isValid) {
        toast({
          title: "Weak Password",
          description: passwordStrength.errors.join(', '),
          variant: "destructive"
        });
        return;
      }
      
      setIsLoading(true);
      try {
        await resetPassword(forgotMobile, forgotOtp, sanitizedNewPassword);
        ValidationUtils.clearRateLimit(`forgot_otp_${forgotMobile}`);
        setShowForgotPassword(false);
        setForgotStep(1);
        setForgotMobile('');
        setForgotOtp('');
        setNewPassword('');
        setConfirmPassword('');
        toast({
          title: "Password Reset Successful!",
          description: "You can now login with your new password"
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to reset password. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const resendOtp = async () => {
    if (otpTimer > 0) return;
    
    const sanitizedMobile = ValidationUtils.sanitizeInput(mobile);
    if (!ValidationUtils.checkRateLimit(`resend_otp_${sanitizedMobile}`, 3, 5 * 60 * 1000)) {
      toast({
        title: "Rate Limit Exceeded",
        description: "Too many resend requests. Please wait 5 minutes.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await sendOTP(sanitizedMobile);
      setOtpTimer(30);
      const timer = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      toast({
        title: "OTP Resent!",
        description: "Please check your mobile for the new verification code"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend OTP. Please try again.",
        variant: "destructive"
      });
    }
  };

  const resendForgotOtp = async () => {
    if (forgotOtpTimer > 0) return;
    
    const sanitizedMobile = ValidationUtils.sanitizeInput(forgotMobile);
    if (!ValidationUtils.checkRateLimit(`resend_forgot_otp_${sanitizedMobile}`, 2, 10 * 60 * 1000)) {
      toast({
        title: "Rate Limit Exceeded",
        description: "Too many resend requests. Please wait 10 minutes.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      await forgotPasswordSendOTP(sanitizedMobile);
      setForgotOtpTimer(30);
      const timer = setInterval(() => {
        setForgotOtpTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      toast({
        title: "OTP Resent!",
        description: "Please check your mobile for the new verification code"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend OTP. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Show security warning if account is locked
  if (isLocked) {
    return (
      <div className="h-screen bg-gradient-subtle flex flex-col lg:flex-row overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b px-4 py-2 flex-shrink-0">
          <div className="flex items-center justify-center gap-2">
            <img 
              src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
              alt="Company Logo" 
              className="h-6 w-6"
              style={{ width: '24px', height: '24px' }}
            />
            <span className="font-bold text-base">NexEagle easyHMS</span>
          </div>
        </div>

        {/* Desktop Promotional Banner (2/3) */}
        <div className="hidden lg:flex w-2/3 bg-gradient-primary items-center justify-center p-8">
          <div className="text-white max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <img 
                src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
                alt="Company Logo" 
                className="h-12 w-12" 
                style={{ width: '48px', height: '48px' }} 
              />
              <h1 className="text-3xl font-bold">Account Security</h1>
            </div>
            
            <h2 className="text-xl font-semibold mb-4">
              Protecting Your Healthcare Practice
            </h2>
            
            <p className="text-lg opacity-90 mb-6 leading-relaxed">
              Your account has been temporarily locked for security reasons. 
              This helps protect your sensitive healthcare data.
            </p>
          </div>
        </div>

        {/* Locked Account Form */}
        <div className="w-full lg:w-1/3 flex items-center justify-center p-4 lg:p-6 flex-1">
          <Card className="w-full max-w-md shadow-elegant">
            <CardHeader className="text-center space-y-3 pb-4">
              <div className="hidden lg:flex justify-center mb-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <CardTitle className="text-xl lg:text-2xl font-bold text-red-600">
                Account Temporarily Locked
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Too many failed login attempts. Please try again in:
              </p>
              <div className="text-2xl font-bold text-red-600">
                {Math.floor(lockoutTimeRemaining / 60)}:{(lockoutTimeRemaining % 60).toString().padStart(2, '0')}
              </div>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={() => window.location.reload()}
                className="w-full h-12 bg-gradient-primary text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                disabled={isLocked}
              >
                {isLocked ? 'Please Wait...' : 'Try Again'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Forgot Password Screen
  if (showForgotPassword) {
    return (
      <div className="h-screen bg-gradient-subtle flex flex-col lg:flex-row overflow-hidden">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b px-4 py-2 flex-shrink-0">
          <div className="flex items-center justify-center gap-2">
            <img 
              src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
              alt="Company Logo" 
              className="h-6 w-6"
              style={{ width: '24px', height: '24px' }}
            />
            <span className="font-bold text-base">Reset Password</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Mobile: Full width, Desktop: 1/3 */}
          <div className="w-full lg:w-1/3 flex items-center justify-center p-4 lg:p-6 order-2 lg:order-2 overflow-y-auto">
            <Card className="w-full max-w-md shadow-elegant">
              <CardHeader className="text-center space-y-3 pb-4">
                {/* Desktop Logo */}
                <div className="hidden lg:flex justify-center mb-3">
                  <div className="p-2 bg-white rounded-full">
                    <img 
                      src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
                      alt="Company Logo" 
                      className="h-10 w-10" 
                      style={{ width: '40px', height: '40px' }} 
                    />
                  </div>
                </div>
                <CardTitle className="text-xl lg:text-2xl font-bold text-healthcare-primary">
                  Reset Password
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  {forgotStep === 1 && "Enter your mobile number to receive OTP"}
                  {forgotStep === 2 && "Enter the 6-digit OTP sent to your mobile"}
                  {forgotStep === 3 && "Create a new secure password"}
                </p>
              </CardHeader>
              
              <CardContent className="px-6 pb-6">
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  {forgotStep === 1 && (
                    <div className="space-y-2">
                      <Label htmlFor="forgotMobile" className="text-sm font-medium">
                        Mobile Number
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="forgotMobile"
                          type="tel"
                          value={forgotMobile}
                          onChange={(e) => setForgotMobile(ValidationUtils.sanitizeInput(e.target.value))}
                          placeholder="+91-XXXXXXXXXX"
                          className="h-12 pl-12 text-base"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  )}

                  {forgotStep === 2 && (
                    <div className="space-y-2">
                      <Label htmlFor="forgotOtp" className="text-sm font-medium">
                        Enter OTP
                      </Label>
                      <Input
                        id="forgotOtp"
                        type="text"
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(ValidationUtils.sanitizeInput(e.target.value))}
                        placeholder="Enter 6-digit OTP"
                        className="h-12 text-center tracking-widest text-base font-mono"
                        maxLength={6}
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-sm"
                        onClick={resendForgotOtp}
                        disabled={forgotOtpTimer > 0 || isLoading}
                      >
                        {forgotOtpTimer > 0 ? `Resend OTP in ${forgotOtpTimer}s` : 'Resend OTP'}
                      </Button>
                    </div>
                  )}

                  {forgotStep === 3 && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword" className="text-sm font-medium">
                          New Password
                        </Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(ValidationUtils.sanitizeInput(e.target.value))}
                          placeholder="Enter new password"
                          className="h-12 text-base"
                          disabled={isLoading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium">
                          Confirm Password
                        </Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(ValidationUtils.sanitizeInput(e.target.value))}
                          placeholder="Confirm new password"
                          className="h-12 text-base"
                          disabled={isLoading}
                        />
                      </div>
                    </>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-primary text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : (
                      forgotStep === 1 ? "Send OTP" :
                      forgotStep === 2 ? "Verify OTP" :
                      "Reset Password"
                    )}
                  </Button>
                </form>

                <div className="mt-4 text-center">
                  <Button
                    variant="link"
                    className="p-0 h-auto text-sm text-muted-foreground"
                    onClick={() => setShowForgotPassword(false)}
                    disabled={isLoading}
                  >
                    ← Back to Login
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Desktop Promotional Banner */}
          <div className="hidden lg:flex w-2/3 bg-gradient-primary items-center justify-center p-8 order-1">
            <div className="text-white max-w-2xl">
              <div className="flex items-center gap-3 mb-6">
                <img 
                  src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
                  alt="Company Logo" 
                  className="h-12 w-12" 
                  style={{ width: '48px', height: '48px' }} 
                />
                <h1 className="text-3xl font-bold">Secure Recovery</h1>
              </div>
              
              <h2 className="text-xl font-semibold mb-4">
                Your Account Security Matters
              </h2>
              
              <p className="text-lg opacity-90 mb-6 leading-relaxed">
                We use advanced OTP verification to ensure your account remains secure 
                while providing quick password recovery.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Login Screen
  return (
    <div className="h-screen bg-gradient-subtle flex flex-col lg:flex-row overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-center gap-2">
          <img 
            src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
            alt="Company Logo" 
            className="h-6 w-6"
            style={{ width: '24px', height: '24px' }}
          />
          <span className="font-bold text-base">NexEagle easyHMS</span>
        </div>
      </div>

      {/* Desktop Promotional Banner (2/3) */}
      <div className="hidden lg:flex w-2/3 bg-gradient-primary items-center justify-center p-8">
        <div className="text-white max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <img 
              src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
              alt="Company Logo" 
              className="h-12 w-12" 
              style={{ width: '48px', height: '48px' }} 
            />
            <h1 className="text-3xl font-bold">NexEagle easyHMS</h1>
          </div>
          
          <h2 className="text-xl font-semibold mb-4">
            Streamline Your Healthcare Practice
          </h2>
          
          <p className="text-lg opacity-90 mb-6 leading-relaxed">
            Complete patient management, appointments, billing, and more. 
            Experience the future of healthcare administration.
          </p>
          
          <div className="grid grid-cols-2 gap-6 mt-8">
            <div className="text-center">
              <div className="text-2xl font-bold">99.9%</div>
              <div className="text-sm opacity-75">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">10K+</div>
              <div className="text-sm opacity-75">Doctors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">50M+</div>
              <div className="text-sm opacity-75">Patients</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-sm opacity-75">Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form - Mobile: Full width, Desktop: 1/3 */}
      <div className="w-full lg:w-1/3 flex items-center justify-center p-4 lg:p-6 flex-1 overflow-y-auto">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader className="text-center space-y-3 pb-4">
            {/* Desktop Logo */}
            <div className="hidden lg:flex justify-center mb-3">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <img 
                  src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
                  alt="Company Logo" 
                  className="h-12 w-12" 
                  style={{ width: '48px', height: '48px' }}
                />
              </div>
            </div>
            <CardTitle className="text-xl lg:text-2xl font-bold text-healthcare-primary">
              NexEagle easyHMS
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Healthcare Management System
            </p>
          </CardHeader>
          
          <CardContent className="px-6 pb-6">
            {loginType === 'password' ? (
              <div className="space-y-4">
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="userid" className="text-sm font-medium">
                      Mobile Number or Email
                    </Label>
                    <Input
                      id="userid"
                      type="text"
                      value={userid}
                      onChange={(e) => setUserid(ValidationUtils.sanitizeInput(e.target.value))}
                      placeholder="Enter mobile number or email"
                      className="h-12 text-base"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(ValidationUtils.sanitizeInput(e.target.value))}
                        placeholder="Enter your password"
                        className="h-12 pr-12 text-base"
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-4 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-sm text-primary"
                      onClick={() => setLoginType('otp')}
                      disabled={isLoading}
                    >
                      Login with OTP
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-sm text-healthcare-primary"
                      onClick={() => setShowForgotPassword(true)}
                      disabled={isLoading}
                    >
                      Forgot Password?
                    </Button>
                  </div>

                  {/* Failed attempts warning */}
                  {failedAttempts > 0 && failedAttempts < 5 && (
                    <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-800">
                        ⚠️ {5 - failedAttempts} login attempt{5 - failedAttempts !== 1 ? 's' : ''} remaining before account lockout
                      </p>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-primary text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Signing in...
                      </div>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                <form onSubmit={handleMobileLogin} className="space-y-4">
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
                        disabled={isOtpSent || isLoading}
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
                        disabled={isLoading}
                      />
                      <div className="flex justify-between items-center">
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto text-sm"
                          onClick={resendOtp}
                          disabled={otpTimer > 0 || isLoading}
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
                        setLoginType('password');
                        setIsOtpSent(false);
                        setMobile('');
                        setOtp('');
                      }}
                      disabled={isLoading}
                    >
                      ← Back to Password Login
                    </Button>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 bg-gradient-primary text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                    disabled={isLoading}
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
              </div>
            )}
            
            {/* Register Now Button - Compact */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Don't have an account yet?
                </p>
                <Button
                  onClick={onSwitchToRegister}
                  className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                  disabled={isLoading}
                >
                  🚀 Register Now - Join 10K+ Doctors!
                </Button>
                <p className="text-xs text-muted-foreground/80 px-2">
                  Free account • Setup in 2 minutes • Start managing patients today
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 