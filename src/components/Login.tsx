import React, { useState } from 'react';
import { Eye, EyeOff, Shield, Stethoscope, Phone, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

interface LoginProps {
  onLogin: () => void;
  onSwitchToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onSwitchToRegister }) => {
  const [loginType, setLoginType] = useState('mobile');
  
  // Mobile + OTP fields
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  
  // Email + Password fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotMobile, setForgotMobile] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: mobile, 2: otp, 3: new password
  
  const [isLoading, setIsLoading] = useState(false);

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
      // Simulate OTP sending
      setTimeout(() => {
        setIsOtpSent(true);
        setIsLoading(false);
        toast({
          title: "OTP Sent!",
          description: "Please check your mobile for the verification code"
        });
      }, 1000);
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
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to NexEagle easyHMS"
      });
      onLogin();
    }, 1000);
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Welcome back!",
        description: "Successfully logged in to NexEagle easyHMS"
      });
      onLogin();
    }, 1000);
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
      setTimeout(() => {
        setForgotStep(2);
        setIsLoading(false);
        toast({
          title: "OTP Sent!",
          description: "Please check your mobile for the verification code"
        });
      }, 1000);
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
      setTimeout(() => {
        setIsLoading(false);
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
      }, 1000);
    }
  };

  const resendOtp = () => {
    toast({
      title: "OTP Resent!",
      description: "Please check your mobile for the new verification code"
    });
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex">
      <div className="w-full lg:w-1/3 flex items-center justify-center p-8 lg:order-2">
          <Card className="w-full max-w-md shadow-elegant">
            <CardHeader className="text-center space-y-2">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gradient-primary rounded-full">
                  <Shield className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-healthcare-primary">
                Reset Password
              </CardTitle>
              <p className="text-muted-foreground">
                {forgotStep === 1 && "Enter your mobile number"}
                {forgotStep === 2 && "Verify OTP"}
                {forgotStep === 3 && "Set new password"}
              </p>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {forgotStep === 1 && (
                  <div className="space-y-2">
                    <Label htmlFor="forgotMobile">Mobile Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="forgotMobile"
                        type="tel"
                        value={forgotMobile}
                        onChange={(e) => setForgotMobile(e.target.value)}
                        placeholder="+91-XXXXXXXXXX"
                        className="h-11 pl-10"
                      />
                    </div>
                  </div>
                )}

                {forgotStep === 2 && (
                  <div className="space-y-2">
                    <Label htmlFor="forgotOtp">Enter OTP</Label>
                    <Input
                      id="forgotOtp"
                      type="text"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      placeholder="Enter 6-digit OTP"
                      className="h-11 text-center tracking-widest"
                      maxLength={6}
                    />
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-sm"
                      onClick={resendOtp}
                    >
                      Resend OTP
                    </Button>
                  </div>
                )}

                {forgotStep === 3 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="h-11"
                      />
                    </div>
                  </>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-primary text-white font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : 
                    forgotStep === 1 ? "Send OTP" :
                    forgotStep === 2 ? "Verify OTP" :
                    "Reset Password"
                  }
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm text-muted-foreground"
                  onClick={() => setShowForgotPassword(false)}
                >
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Left side - Promotional Banner */}
        <div className="hidden lg:flex w-2/3 bg-gradient-primary items-center justify-center p-12 lg:order-1">
          <div className="text-white max-w-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-12 w-12" />
              <h1 className="text-4xl font-bold">Secure Recovery</h1>
            </div>
            
            <h2 className="text-2xl font-semibold mb-4">
              Your Account Security Matters
            </h2>
            
            <p className="text-xl opacity-90 mb-8">
              We use advanced OTP verification to ensure your account remains secure 
              while providing quick password recovery.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex">
      {/* Left side - Promotional Banner (2/3) */}
      <div className="hidden lg:flex w-2/3 bg-gradient-primary items-center justify-center p-12">
        <div className="text-white max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Stethoscope className="h-12 w-12" />
            <h1 className="text-4xl font-bold">NexEagle easyHMS</h1>
          </div>
          
          <h2 className="text-2xl font-semibold mb-4">
            Streamline Your Healthcare Practice
          </h2>
          
          <p className="text-xl opacity-90 mb-8">
            Complete patient management, appointments, billing, and more. 
            Experience the future of healthcare administration.
          </p>
          
          <div className="grid grid-cols-2 gap-6 mt-8">
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

      {/* Right side - Login Form (1/3) */}
      <div className="w-full lg:w-1/3 flex items-center justify-center p-4 lg:p-8">
        <Card className="w-full max-w-md shadow-elegant">
          <CardHeader className="text-center space-y-2">
            {/* Register Now Button - Top Position */}
            <div className="flex justify-end mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onSwitchToRegister}
                className="text-healthcare-primary border-healthcare-primary hover:bg-healthcare-primary hover:text-white"
              >
                Register Now
              </Button>
            </div>
            
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-gradient-primary rounded-full">
                <Stethoscope className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-healthcare-primary">
              NexEagle easyHMS
            </CardTitle>
            <p className="text-muted-foreground">
              Healthcare Management System
            </p>
          </CardHeader>
          
          <CardContent>
            <Tabs value={loginType} onValueChange={setLoginType} className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="mobile" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Mobile + OTP
                </TabsTrigger>
                <TabsTrigger value="email" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Email + Password
                </TabsTrigger>
              </TabsList>

              <TabsContent value="mobile">
                <form onSubmit={handleMobileLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="mobile"
                        type="tel"
                        value={mobile}
                        onChange={(e) => setMobile(e.target.value)}
                        placeholder="+91-XXXXXXXXXX"
                        className="h-11 pl-10"
                        disabled={isOtpSent}
                      />
                    </div>
                  </div>
                  
                  {isOtpSent && (
                    <div className="space-y-2">
                      <Label htmlFor="otp">Enter OTP</Label>
                      <Input
                        id="otp"
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter 6-digit OTP"
                        className="h-11 text-center tracking-widest"
                        maxLength={6}
                      />
                      <div className="flex justify-between items-center">
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto text-sm"
                          onClick={resendOtp}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Resend OTP
                        </Button>
                      </div>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-gradient-primary text-white font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing..." : isOtpSent ? "Verify & Login" : "Send OTP"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="email">
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="h-11 pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emailPassword">Password</Label>
                    <div className="relative">
                      <Input
                        id="emailPassword"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="h-11 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end">
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
                    className="w-full h-11 bg-gradient-primary text-white font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Login"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};