import React, { useState, useEffect } from 'react';
import { Check, X, Shield, ArrowLeft, Phone, User, Lock, Sparkles, Star, Award, Zap, Heart, Globe, UserCheck, Crown, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';

interface RegistrationProps {
  onRegister: () => void;
  onSwitchToLogin: () => void;
}

export const Registration: React.FC<RegistrationProps> = ({ onRegister, onSwitchToLogin }) => {
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Password strength validation
  const passwordValidation = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
  };

  const passwordStrength = Object.values(passwordValidation).filter(Boolean).length;
  const progressPercentage = step === 1 ? 25 : step === 2 ? 50 : step === 3 ? 75 : 100;

  // Format mobile number
  const formatMobile = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned;
    }
    return cleaned.slice(0, 10);
  };

  // OTP timer
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  // Auto-submit OTP when 6 digits entered
  useEffect(() => {
    if (otp.length === 6) {
      verifyOTP();
    }
  }, [otp]);

  const handleUserTypeSelection = (type: string) => {
    setUserType(type);
    setStep(2);
    toast({
      title: "Great Choice! 🎯",
      description: `Selected: ${type === 'doctor' ? 'Doctor & Admin' : 'Admin Only'}`
    });
  };

  const sendOTP = async () => {
    if (mobile.length !== 10) {
      toast({
        title: "Invalid Mobile",
        description: "Please enter a valid 10-digit mobile number",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setOtpSent(true);
      setResendTimer(30);
      toast({
        title: "OTP Sent! 🚀",
        description: `Verification code sent to +91 ${mobile}`
      });
    }, 1000);
  };

  const verifyOTP = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(3);
      toast({
        title: "Mobile Verified! ✅",
        description: "Almost done! Set up your email & password"
      });
    }, 1000);
  };

  const handleSkip = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Welcome to NexEagle! 🎉",
        description: "Account created successfully! You can add email later."
      });
      onRegister();
    }, 1000);
  };

  const handleFinalStep = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields or skip this step",
        variant: "destructive"
      });
      return;
    }

    if (passwordStrength < 3) {
      toast({
        title: "Weak Password",
        description: "Please create a stronger password",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Welcome to NexEagle! 🎉",
        description: "Your account has been created successfully"
      });
      onRegister();
    }, 1500);
  };

  const userTypes = [
    {
      id: 'doctor',
      title: 'Doctor & Admin',
      subtitle: 'Full access to all features',
      description: 'Manage patients, appointments, prescriptions, billing & admin functions',
      icon: UserCheck,
      color: 'from-blue-500 to-cyan-500',
      benefits: ['Patient Management', 'E-Prescriptions', 'Appointment Booking', 'Billing & Reports', 'Admin Dashboard']
    },
    {
      id: 'admin',
      title: 'Admin Only',
      subtitle: 'Administrative access',
      description: 'Handle appointments, billing, reports and administrative tasks',
      icon: Crown,
      color: 'from-purple-500 to-pink-500',
      benefits: ['Appointment Management', 'Billing & Invoicing', 'Reports & Analytics', 'User Management', 'System Settings']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex">
      {/* Left side - Benefits & Promotional */}
      <div className="hidden lg:flex w-2/3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-white/5" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px'
            }}></div>
          </div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center p-12 text-white max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                <Sparkles className="h-8 w-8" />
              </div>
              <h1 className="text-5xl font-bold">Join NexEagle</h1>
            </div>
            
            <p className="text-xl opacity-90 mb-8">
              The most advanced Hospital Management System trusted by thousands of healthcare professionals worldwide
            </p>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 mb-12">
              <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-xl">
                <div className="text-3xl font-bold">10K+</div>
                <div className="text-sm opacity-80">Active Doctors</div>
              </div>
              <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-xl">
                <div className="text-3xl font-bold">1M+</div>
                <div className="text-sm opacity-80">Patients Served</div>
              </div>
              <div className="text-center p-4 bg-white/10 backdrop-blur-sm rounded-xl">
                <div className="text-3xl font-bold">99.9%</div>
                <div className="text-sm opacity-80">Uptime</div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-8 p-6 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 backdrop-blur-sm rounded-2xl border border-white/20">
            <div className="flex items-center gap-3 mb-2">
              <Star className="h-5 w-5 text-yellow-300" />
              <span className="font-semibold">Limited Time Offer</span>
            </div>
            <p className="text-sm opacity-90">
              🎉 First 100 doctors get <strong>3 months FREE</strong> premium features!
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Registration Form */}
      <div className="w-full lg:w-1/3 flex items-center justify-center p-6 lg:p-8">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-xl">
          <CardHeader className="text-center space-y-4 pb-6">
            {/* Back Button */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={step === 1 ? onSwitchToLogin : () => setStep(step - 1)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">Step {step} of 3</div>
                <Progress value={progressPercentage} className="w-20 h-2" />
              </div>
            </div>
            
            {/* Header */}
            <div className="space-y-2">
              <div className="flex justify-center">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                  {step === 1 && <Building2 className="h-8 w-8 text-white" />}
                  {step === 2 && <Phone className="h-8 w-8 text-white" />}
                  {step === 3 && <User className="h-8 w-8 text-white" />}
                </div>
              </div>
              
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {step === 1 && "Choose Your Role"}
                {step === 2 && "Quick Verification"}
                {step === 3 && "Almost Done!"}
              </CardTitle>
              
              <p className="text-muted-foreground text-sm">
                {step === 1 && "Select the access level that suits you best"}
                {step === 2 && "Secure your account with mobile verification"}
                {step === 3 && "Set up email & password (optional)"}
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Step 1: User Type Selection */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                {userTypes.map((type) => (
                  <div
                    key={type.id}
                    onClick={() => handleUserTypeSelection(type.id)}
                    className="group cursor-pointer transform transition-all duration-300 hover:scale-105"
                  >
                    <Card className="border-2 border-transparent hover:border-blue-300 hover:shadow-lg transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${type.color} shadow-md group-hover:shadow-lg transition-shadow`}>
                            <type.icon className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">
                              {type.title}
                            </h3>
                            <p className="text-sm text-blue-600 font-medium mb-2">{type.subtitle}</p>
                            <p className="text-sm text-gray-600 mb-3">{type.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {type.benefits.slice(0, 3).map((benefit, idx) => (
                                <span key={idx} className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                                  {benefit}
                                </span>
                              ))}
                              {type.benefits.length > 3 && (
                                <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                                  +{type.benefits.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}

            {/* Step 2: Mobile Verification */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="mobile" className="text-sm font-medium">Mobile Number</Label>
                  <div className="flex">
                    <div className="flex items-center px-4 bg-gradient-to-r from-gray-50 to-gray-100 border border-r-0 rounded-l-lg">
                      <span className="text-sm font-semibold text-gray-700">+91</span>
                    </div>
                    <Input
                      id="mobile"
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(formatMobile(e.target.value))}
                      placeholder="Enter mobile number"
                      className="h-12 rounded-l-none border-l-0 focus:ring-2 focus:ring-blue-500 text-lg"
                      maxLength={10}
                    />
                  </div>
                  {mobile.length === 10 && (
                    <div className="flex items-center gap-2 text-sm text-green-600 animate-fade-in">
                      <Check className="h-4 w-4" />
                      <span>Valid mobile number</span>
                    </div>
                  )}
                </div>

                {!otpSent && (
                  <Button 
                    onClick={sendOTP}
                    disabled={mobile.length !== 10 || isLoading}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
                  >
                    {isLoading ? "Sending OTP..." : "Send OTP"}
                  </Button>
                )}

                {otpSent && (
                  <div className="space-y-3 animate-fade-in">
                    <Label htmlFor="otp" className="text-sm font-medium">Enter OTP</Label>
                    <Input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="• • • • • •"
                      className="h-12 text-center text-2xl tracking-[0.5em] font-bold focus:ring-2 focus:ring-blue-500"
                      maxLength={6}
                    />
                    
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        Sent to +91 {mobile}
                      </span>
                      {resendTimer > 0 ? (
                        <span className="text-blue-600 font-medium">
                          Resend in {resendTimer}s
                        </span>
                      ) : (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={sendOTP}
                          className="p-0 h-auto text-blue-600 hover:text-blue-700 font-medium"
                        >
                          Resend OTP
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {isLoading && otpSent && (
                  <div className="text-center py-6">
                    <div className="inline-flex items-center gap-3 text-blue-600">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="font-medium">Verifying...</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Email & Password (Optional) */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <div className="text-center mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>Optional:</strong> Add email & password for enhanced security, or skip to continue
                  </p>
                </div>

                <form onSubmit={handleFinalStep} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email Address (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="h-12 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">Password (Optional)</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a secure password"
                      className="h-12 focus:ring-2 focus:ring-blue-500"
                    />
                    
                    {password && (
                      <div className="space-y-2 mt-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries({
                            '8+ chars': passwordValidation.minLength,
                            'Uppercase': passwordValidation.hasUpper,
                            'Lowercase': passwordValidation.hasLower,
                            'Number': passwordValidation.hasNumber,
                          }).map(([label, valid]) => (
                            <div key={label} className={`flex items-center gap-2 p-2 rounded-lg ${valid ? 'text-green-700 bg-green-50' : 'text-gray-500 bg-gray-50'}`}>
                              {valid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                              <span className="font-medium">{label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      type="button"
                      onClick={handleSkip}
                      variant="outline"
                      className="flex-1 h-12 font-semibold border-2 hover:bg-gray-50 hover:text-gray-900 text-gray-700"
                      disabled={isLoading}
                    >
                      Skip for Now
                    </Button>
                    
                    <Button 
                      type="submit" 
                      className="flex-1 h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
                      disabled={isLoading || (password && passwordStrength < 3)}
                    >
                      {isLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Creating...
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          Complete Setup
                        </div>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Login Link */}
            <div className="text-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Button
                  variant="link"
                  className="p-0 h-auto text-blue-600 hover:text-blue-700 font-semibold"
                  onClick={onSwitchToLogin}
                >
                  Sign in here
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};