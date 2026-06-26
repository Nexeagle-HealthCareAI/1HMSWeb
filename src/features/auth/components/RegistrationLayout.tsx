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
  const progressPercentage = currentStep === 1 ? 33 : currentStep === 2 ? 66 : currentStep === 3 ? 100 : 100;

  // Determine if back button should be shown
  const shouldShowBackButton = () => {
    // Hide back button on all steps
    return false;
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-white to-brand-50 flex overflow-hidden">
      {/* Left Side - Promotional Content (2/3 width) */}
      <div className="hidden lg:flex lg:w-2/3 bg-gradient-to-br from-brand-600 via-purple-600 to-brand-700 p-8 items-center justify-center relative">
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
              <div className="hidden items-center justify-center w-8 h-8 bg-gradient-to-br from-brand-400 to-purple-400 rounded-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold">Join NexEagle</h1>
          </div>
          
          <h2 className="text-xl font-semibold mb-6 text-center">
            The most advanced Hospital Management System trusted by thousands of healthcare professionals worldwide
          </h2>
          
        </div>
      </div>

      {/* Right Side - Registration Form (1/3 width) */}
      <div className="flex-1 lg:w-1/3 flex items-center justify-center p-4 lg:p-6">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-xl my-4">
          <CardHeader className="text-center space-y-2 pb-3 pt-4 relative">
            {/* Back Arrow Button - Top Left */}
            {((currentStep === 1 && onSwitchToLogin) || (currentStep > 1 && onBack)) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (currentStep === 1 && onSwitchToLogin) {
                    onSwitchToLogin();
                  } else if (currentStep > 1 && onBack) {
                    onBack();
                  }
                }}
                className="absolute left-4 top-4 h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label={currentStep === 1 ? "Back to login" : "Go back to previous step"}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            
            {/* Progress Indicator */}
            <div className="flex items-center justify-end">
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-0.5">Step {currentStep} of 3</div>
                <Progress value={progressPercentage} className="w-16 h-1.5" />
              </div>
            </div>
            
            {/* Header */}
            <div className="space-y-1.5">
              <div className="flex justify-center">
                <div className="p-1">
                  <img src="/Logo.png" alt="Company Logo" className="h-10 w-12" />
                </div>
              </div>
              
              <CardTitle className="text-lg font-bold bg-gradient-to-r from-brand-600 to-brand-600 bg-clip-text text-transparent">
                {currentStep === 1 && "Choose Your Role"}
                {currentStep === 2 && "Quick Verification"}
                {currentStep === 3 && "Account Setup"}
              </CardTitle>
              
              <p className="text-muted-foreground text-xs leading-tight">
                {currentStep === 1 && "Select the access level that best matches your responsibilities"}
                {currentStep === 2 && "Secure your account with mobile verification"}
                {currentStep === 3 && "Set up email & password (optional)"}
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="bg-white space-y-2 px-4 pb-4">
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 