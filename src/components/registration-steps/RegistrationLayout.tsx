import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Shield, ArrowLeft } from 'lucide-react';

interface RegistrationLayoutProps {
  children: React.ReactNode;
  currentStep?: number;
  otpVerified?: boolean;
  onBack?: () => void;
  onSwitchToLogin?: () => void;
}

export const RegistrationLayout: React.FC<RegistrationLayoutProps> = ({
  children,
  currentStep = 1,
  otpVerified = false,
  onBack,
  onSwitchToLogin
}) => {
  const progressPercentage = currentStep === 1 ? 25 : currentStep === 2 ? 50 : currentStep === 3 ? 75 : 100;

  // Determine if back button should be shown
  const shouldShowBackButton = () => {
    if (currentStep === 1) {
      return true; // Always show on step 1 (goes to login)
    }
    if (currentStep === 2) {
      return true; // Always show on step 2 (goes back to step 1)
    }
    if (currentStep === 3) {
      return !otpVerified; // Hide back button on step 3 if OTP is verified
    }
    return true;
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex overflow-hidden">
      {/* Left Side - Promotional Content (2/3 width) */}
      <div className="hidden lg:flex lg:w-2/3 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 p-8 items-center justify-center relative">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        
        <div className="text-white max-w-3xl relative z-10">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-8 w-18  flex items-center justify-center">
              <img 
                src="/Logo.png" 
                alt="NexEagle Logo" 
                className="h-20 w-20 object-contain"               
              />
              <div className="hidden items-center justify-center w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-400 rounded-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold">Join NexEagle</h1>
          </div>
          
          <h2 className="text-xl font-semibold mb-6 text-center">
            The most advanced Hospital Management System trusted by thousands of healthcare professionals worldwide
          </h2>
          
          {/* Statistics Cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-2xl font-bold mb-1">10K+</div>
              <div className="text-sm opacity-90">Active Doctors</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-2xl font-bold mb-1">1M+</div>
              <div className="text-sm opacity-90">Patients Served</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-2xl font-bold mb-1">99.9%</div>
              <div className="text-sm opacity-90">Uptime</div>
            </div>
          </div>
          
          {/* Limited Time Offer */}
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg p-4 border border-purple-500/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-300">⭐</span>
              <span className="font-semibold">Limited Time Offer</span>
            </div>
            <p className="text-sm opacity-90">
              First 100 doctors get 3 months FREE premium features!
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form (1/3 width) */}
      <div className="flex-1 lg:w-1/3 flex items-center justify-center p-6 lg:p-8">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-xl">
          <CardHeader className="text-center space-y-4 pb-6">
            {/* Back Button */}
            <div className="flex items-center justify-between">
              {shouldShowBackButton() && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={currentStep === 1 ? onSwitchToLogin : onBack}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-1">Step {currentStep} of 3</div>
                <Progress value={progressPercentage} className="w-20 h-2" />
              </div>
            </div>
            
            {/* Header */}
            <div className="space-y-2">
              <div className="flex justify-center">
                <div className="p-4 ">
                  <img src="/Logo.png" alt="Company Logo" className="h-16 w-16" />
                </div>
              </div>
              
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {currentStep === 1 && "Choose Your Role"}
                {currentStep === 2 && "Quick Verification"}
                {currentStep === 3 && "Almost Done!"}
              </CardTitle>
              
              <p className="text-muted-foreground text-sm">
                {currentStep === 1 && "Select the access level that best matches your responsibilities and requirements"}
                {currentStep === 2 && "Secure your account with mobile verification"}
                {currentStep === 3 && "Set up email & password (optional)"}
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 