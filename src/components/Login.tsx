import React, { useState } from 'react';
import { Eye, EyeOff, Shield, Stethoscope, Phone, Mail, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface LoginProps {
  onLogin: () => void;
  onSwitchToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToRegister }) => {
  const { login, loginWithOTP, sendOTP, forgotPasswordSendOTP, resetPassword } = useAuth();
  const [loginType, setLoginType] = useState('password'); // 'password' or 'otp'
  
  // Main login fields
  const [userid, setUserid] = useState(''); // Can be mobile or email
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
  const [forgotStep, setForgotStep] = useState(1); // 1: mobile, 2: otp, 3: new password
  
  const [isLoading, setIsLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [forgotOtpTimer, setForgotOtpTimer] = useState(0);

  const handleMobileLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mobile) {
      toast({
        title: "Error",
        description: "Please enter your mobile number",
        variant: "destructive"
      });
      return;
    }

    if (!isOtpSent) {
      setIsLoading(true);
      try {
        await sendOTP(mobile);
        setIsOtpSent(true);
        toast({
          title: "OTP Sent!",
          description: "Please check your mobile for the verification code"
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to send OTP",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!otp || otp.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter the 6-digit OTP",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await loginWithOTP(mobile, otp);
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to NexEagle easyHMS"
      });
      onLogin();
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Invalid OTP",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userid || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      await login(userid, password);
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to NexEagle easyHMS"
      });
      onLogin();
    } catch (error) {
      toast({
        title: "Login Failed",
        description: error instanceof Error ? error.message : "Invalid credentials",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (forgotStep === 1) {
      if (!forgotMobile) {
        toast({
          title: "Error",
          description: "Please enter your mobile number",
          variant: "destructive"
        });
        return;
      }
      setIsLoading(true);
      try {
        await forgotPasswordSendOTP(forgotMobile);
        setForgotStep(2);
        toast({
          title: "OTP Sent!",
          description: "Please check your mobile for the verification code"
        });
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to send OTP",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    } else if (forgotStep === 2) {
      if (!forgotOtp || forgotOtp.length !== 6) {
        toast({
          title: "Error",
          description: "Please enter the 6-digit OTP",
          variant: "destructive"
        });
        return;
      }
      setForgotStep(3);
    } else {
      if (!newPassword || !confirmPassword) {
        toast({
          title: "Error",
          description: "Please fill in all fields",
          variant: "destructive"
        });
        return;
      }
      if (newPassword !== confirmPassword) {
        toast({
          title: "Error",
          description: "Passwords do not match",
          variant: "destructive"
        });
        return;
      }
      
      setIsLoading(true);
      try {
        await resetPassword(forgotMobile, forgotOtp, newPassword);
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
          description: error instanceof Error ? error.message : "Failed to reset password",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const resendOtp = async () => {
    if (otpTimer > 0) return;
    
    try {
      await sendOTP(mobile);
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
        description: error instanceof Error ? error.message : "Failed to resend OTP",
        variant: "destructive"
      });
    }
  };

  const resendForgotOtp = async () => {
    if (forgotOtpTimer > 0) return;
    
    try {
      await forgotPasswordSendOTP(forgotMobile);
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
        description: error instanceof Error ? error.message : "Failed to resend OTP",
        variant: "destructive"
      });
    }
  };

  // Mobile-friendly Forgot Password Screen
  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForgotPassword(false)}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <img 
                src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
                alt="Company Logo" 
                className="h-8 w-8"
                style={{ width: '32px', height: '32px' }}
              />
              <span className="font-semibold text-lg">Reset Password</span>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Mobile: Full width, Desktop: 1/3 */}
          <div className="w-full lg:w-1/3 flex items-center justify-center p-4 lg:p-8 order-2 lg:order-2">
            <Card className="w-full max-w-md shadow-elegant">
              <CardHeader className="text-center space-y-4 pb-6">
                {/* Desktop Logo */}
                <div className="hidden lg:flex justify-center mb-4">
                  <div className="p-3 bg-white rounded-full">
                    <img 
                      src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
                      alt="Company Logo" 
                      className="h-12 w-12" 
                      style={{ width: '96px', height: '96px' }} 
                    />
                  </div>
                </div>
                <CardTitle className="text-2xl lg:text-3xl font-bold text-healthcare-primary">
                  Reset Password
                </CardTitle>
                <p className="text-muted-foreground text-sm lg:text-base">
                  {forgotStep === 1 && "Enter your mobile number to receive OTP"}
                  {forgotStep === 2 && "Enter the 6-digit OTP sent to your mobile"}
                  {forgotStep === 3 && "Create a new secure password"}
                </p>
              </CardHeader>
              
              <CardContent className="px-6 pb-8">
                <form onSubmit={handleForgotPassword} className="space-y-6">
                  {forgotStep === 1 && (
                    <div className="space-y-3">
                      <Label htmlFor="forgotMobile" className="text-sm font-medium">
                        Mobile Number
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="forgotMobile"
                          type="tel"
                          value={forgotMobile}
                          onChange={(e) => setForgotMobile(e.target.value)}
                          placeholder="+91-XXXXXXXXXX"
                          className="h-14 pl-12 text-base"
                        />
                      </div>
                    </div>
                  )}

                  {forgotStep === 2 && (
                    <div className="space-y-3">
                      <Label htmlFor="forgotOtp" className="text-sm font-medium">
                        Enter OTP
                      </Label>
                      <Input
                        id="forgotOtp"
                        type="text"
                        value={forgotOtp}
                        onChange={(e) => setForgotOtp(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        className="h-14 text-center tracking-widest text-lg font-mono"
                        maxLength={6}
                      />
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-sm"
                        onClick={resendForgotOtp}
                        disabled={forgotOtpTimer > 0}
                      >
                        {forgotOtpTimer > 0 ? `Resend OTP in ${forgotOtpTimer}s` : 'Resend OTP'}
                      </Button>
                    </div>
                  )}

                  {forgotStep === 3 && (
                    <>
                      <div className="space-y-3">
                        <Label htmlFor="newPassword" className="text-sm font-medium">
                          New Password
                        </Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                          className="h-14 text-base"
                        />
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium">
                          Confirm Password
                        </Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          className="h-14 text-base"
                        />
                      </div>
                    </>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-14 bg-gradient-primary text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : (
                      forgotStep === 1 ? "Send OTP" :
                      forgotStep === 2 ? "Verify OTP" :
                      "Reset Password"
                    )}
                  </Button>
                </form>

                <div className="mt-6 text-center">
                  <Button
                    variant="link"
                    className="p-0 h-auto text-sm text-muted-foreground"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    ← Back to Login
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Desktop Promotional Banner */}
          <div className="hidden lg:flex w-2/3 bg-gradient-primary items-center justify-center p-12 order-1">
            <div className="text-white max-w-2xl">
              <div className="flex items-center gap-4 mb-8">
                <img 
                  src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
                  alt="Company Logo" 
                  className="h-16 w-16" 
                  style={{ width: '96px', height: '96px' }} 
                />
                <h1 className="text-4xl font-bold">Secure Recovery</h1>
              </div>
              
              <h2 className="text-2xl font-semibold mb-6">
                Your Account Security Matters
              </h2>
              
              <p className="text-xl opacity-90 mb-8 leading-relaxed">
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
    <div className="min-h-screen bg-gradient-subtle flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <img 
            src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
            alt="Company Logo" 
            className="h-8 w-8"
            style={{ width: '32px', height: '32px' }}
          />
          <span className="font-bold text-lg">NexEagle easyHMS</span>
        </div>
      </div>

      {/* Desktop Promotional Banner (2/3) */}
      <div className="hidden lg:flex w-2/3 bg-gradient-primary items-center justify-center p-12">
        <div className="text-white max-w-2xl">
          <div className="flex items-center gap-4 mb-8">
            <img 
              src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
              alt="Company Logo" 
              className="h-16 w-16" 
              style={{ width: '96px', height: '96px' }} 
            />
            <h1 className="text-4xl font-bold">NexEagle easyHMS</h1>
          </div>
          
          <h2 className="text-2xl font-semibold mb-6">
            Streamline Your Healthcare Practice
          </h2>
          
          <p className="text-xl opacity-90 mb-8 leading-relaxed">
            Complete patient management, appointments, billing, and more. 
            Experience the future of healthcare administration.
          </p>
          
          <div className="grid grid-cols-2 gap-8 mt-10">
            <div className="text-center">
              <div className="text-3xl font-bold">99.9%</div>
              <div className="text-sm opacity-75">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">10K+</div>
              <div className="text-sm opacity-75">Doctors</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">50M+</div>
              <div className="text-sm opacity-75">Patients</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">24/7</div>
              <div className="text-sm opacity-75">Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form - Mobile: Full width, Desktop: 1/3 */}
      <div className="w-full lg:w-1/3 flex items-center justify-center p-4 lg:p-8 flex-1">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader className="text-center space-y-4 pb-6">
            {/* Desktop Logo */}
            <div className="hidden lg:flex justify-center mb-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <img 
                  src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
                  alt="Company Logo" 
                  className="h-20 w-20" 
                  style={{ width: '96px', height: '96px' }}
                />
              </div>
            </div>
            <CardTitle className="text-2xl lg:text-3xl font-bold text-healthcare-primary">
              NexEagle easyHMS
            </CardTitle>
            <p className="text-muted-foreground text-sm lg:text-base">
              Healthcare Management System
            </p>
          </CardHeader>
          
          <CardContent className="px-6 pb-8">
            {loginType === 'password' ? (
              <div className="space-y-6">
                <form onSubmit={handlePasswordLogin} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="userid" className="text-sm font-medium">
                      Mobile Number or Email
                    </Label>
                    <Input
                      id="userid"
                      type="text"
                      value={userid}
                      onChange={(e) => setUserid(e.target.value)}
                      placeholder="Enter mobile number or email"
                      className="h-14 text-base"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="h-14 pr-12 text-base"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-4 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-sm text-primary"
                      onClick={() => setLoginType('otp')}
                    >
                      Login with OTP
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-sm text-healthcare-primary"
                      onClick={() => setShowForgotPassword(true)}
                    >
                      Forgot Password?
                    </Button>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-14 bg-gradient-primary text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Signing in...
                      </div>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                <form onSubmit={handleMobileLogin} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="mobile" className="text-sm font-medium">
                      Mobile Number
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="mobile"
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="+91-XXXXXXXXXX"
                        className="h-14 pl-12 text-base"
                        disabled={isOtpSent}
                      />
                    </div>
                  </div>
                  
                  {isOtpSent && (
                    <div className="space-y-3">
                      <Label htmlFor="otp" className="text-sm font-medium">
                        Enter OTP
                      </Label>
                      <Input
                        id="otp"
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        className="h-14 text-center tracking-widest text-lg font-mono"
                        maxLength={6}
                      />
                      <div className="flex justify-between items-center">
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto text-sm"
                          onClick={resendOtp}
                          disabled={otpTimer > 0}
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
                    >
                      ← Back to Password Login
                    </Button>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-14 bg-gradient-primary text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Processing...
                      </div>
                    ) : (
                      isOtpSent ? "Verify & Login" : "Send OTP"
                    )}
                  </Button>
                </form>
              </div>
            )}
            
            {/* Register Now Button - Mobile Optimized */}
            <div className="mt-8 pt-6 border-t border-border">
              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Don't have an account yet?
                </p>
                <Button
                  onClick={onSwitchToRegister}
                  className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                >
                  🚀 Register Now - Join 10K+ Doctors!
                </Button>
                <p className="text-xs text-muted-foreground/80 px-4">
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