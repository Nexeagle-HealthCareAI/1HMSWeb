import React, { useState, useEffect } from 'react';
import { Check, X, Shield, ArrowLeft, Phone, User, Lock, Sparkles, Star, Award, Zap, Heart, Globe } from 'lucide-react';
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
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Password strength validation
  const passwordValidation = {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const passwordStrength = Object.values(passwordValidation).filter(Boolean).length;
  const progressPercentage = step === 1 ? 33 : step === 2 ? 66 : 100;

  // Format mobile number
  const formatMobile = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 10) {
      return cleaned;
    }
    return cleaned.slice(0, 10);
  };

  // Auto-send OTP when valid mobile is entered
  useEffect(() => {
    if (mobile.length === 10 && !otpSent) {
      sendOTP();
    }
  }, [mobile]);

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

  const sendOTP = async () => {
    setIsLoading(true);
    // Simulate OTP sending
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
    // Simulate OTP verification
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
      toast({
        title: "Mobile Verified! ✅",
        description: "Let's complete your profile"
      });
    }, 1000);
  };

  const handleStepTwo = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!doctorName || !email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    setStep(3);
    toast({
      title: "Almost Done! 🎯",
      description: "Just set up your password"
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      toast({
        title: "Error",
        description: "Please create a password",
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

  const benefits = [
    { icon: Zap, title: "Lightning Fast", desc: "Get started in under 60 seconds" },
    { icon: Shield, title: "Bank-Level Security", desc: "Your data is protected with military-grade encryption" },
    { icon: Heart, title: "Loved by 10K+ Doctors", desc: "Join the fastest-growing HMS platform" },
    { icon: Globe, title: "Available 24/7", desc: "Access your practice anywhere, anytime" },
    { icon: Star, title: "5-Star Rated", desc: "Top-rated by healthcare professionals" },
    { icon: Award, title: "Industry Leader", desc: "Trusted by leading healthcare institutions" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex">
      {/* Left side - Benefits & Promotional */}
      <div className="hidden lg:flex w-2/3 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-white/5" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px'
            }}></div>
          </div>
        </div>
        
        {/* Content */}
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

          {/* Benefits Grid */}
          <div className="grid grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-4 bg-white/10 backdrop-blur-sm rounded-xl hover:bg-white/20 transition-all duration-300"
              >
                <benefit.icon className="h-6 w-6 mt-1 flex-shrink-0 text-yellow-300" />
                <div>
                  <h3 className="font-semibold text-sm">{benefit.title}</h3>
                  <p className="text-xs opacity-80 mt-1">{benefit.desc}</p>
                </div>
              </div>
            ))}
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
                onClick={onSwitchToLogin}
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
                  {step === 1 && <Phone className="h-8 w-8 text-white" />}
                  {step === 2 && <User className="h-8 w-8 text-white" />}
                  {step === 3 && <Lock className="h-8 w-8 text-white" />}
                </div>
              </div>
              
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {step === 1 && "Quick Verification"}
                {step === 2 && "Your Details"}
                {step === 3 && "Secure Password"}
              </CardTitle>
              
              <p className="text-muted-foreground text-sm">
                {step === 1 && "Lightning fast mobile verification"}
                {step === 2 && "Tell us a bit about yourself"}
                {step === 3 && "Protect your account with a strong password"}
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Step 1: Mobile Verification */}
            {step === 1 && (
              <div className="space-y-4">
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

                {isLoading && (
                  <div className="text-center py-6">
                    <div className="inline-flex items-center gap-3 text-blue-600">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="font-medium">
                        {!otpSent ? "Sending OTP..." : "Verifying..."}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Profile Information */}
            {step === 2 && (
              <form onSubmit={handleStepTwo} className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="doctorName" className="text-sm font-medium">Full Name</Label>
                  <Input
                    id="doctorName"
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="Dr. John Smith"
                    className="h-12 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@hospital.com"
                    className="h-12 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200"
                >
                  Continue to Password
                </Button>
              </form>
            )}

            {/* Step 3: Password Creation */}
            {step === 3 && (
              <form onSubmit={handleRegister} className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Create Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="h-12 focus:ring-2 focus:ring-blue-500"
                  />
                  
                  {password && (
                    <div className="space-y-3 mt-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {Object.entries({
                          '8+ characters': passwordValidation.minLength,
                          'Uppercase': passwordValidation.hasUpper,
                          'Lowercase': passwordValidation.hasLower,
                          'Number': passwordValidation.hasNumber,
                          'Special char': passwordValidation.hasSpecial
                        }).map(([label, valid]) => (
                          <div key={label} className={`flex items-center gap-2 p-2 rounded-lg ${valid ? 'text-green-700 bg-green-50' : 'text-gray-500 bg-gray-50'}`}>
                            {valid ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            <span className="font-medium">{label}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Password Strength</span>
                          <span className={`font-semibold ${
                            passwordStrength <= 2 ? 'text-red-500' : 
                            passwordStrength <= 3 ? 'text-yellow-500' : 
                            'text-green-500'
                          }`}>
                            {passwordStrength <= 2 ? 'Weak' : passwordStrength <= 3 ? 'Fair' : 'Strong'}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                                i <= passwordStrength
                                  ? i <= 2 ? 'bg-red-400' : i <= 3 ? 'bg-yellow-400' : 'bg-green-400'
                                  : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50"
                  disabled={isLoading || passwordStrength < 3}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Creating Account...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Create My Account
                    </div>
                  )}
                </Button>
              </form>
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