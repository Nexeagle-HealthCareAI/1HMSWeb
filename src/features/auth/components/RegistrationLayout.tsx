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
    <div className="h-[100dvh] bg-slate-50 dark:bg-gray-950 flex flex-col lg:flex-row overflow-hidden relative transition-all duration-300">
      
      {/* --- MOBILE VIEW --- */}
      <div className="flex lg:hidden flex-col h-full w-full relative">
        {/* Mobile Hero (Top Half) */}
        <div className="h-[40%] w-full bg-gradient-to-br from-brand-600 via-purple-600 to-brand-700 relative overflow-hidden flex flex-col items-center justify-center pt-8 pb-12">
          {/* Ambient shapes */}
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-white/10 blur-[60px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-20%] w-[70%] h-[70%] rounded-full bg-purple-400/20 blur-[60px] pointer-events-none" />
          
          {/* Back Button */}
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
              className="absolute left-4 top-4 h-10 w-10 text-white/80 hover:text-white hover:bg-white/20 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}

          <div className="relative z-10 flex flex-col items-center mt-4">
            <img
              src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png"
              alt="Company Logo"
              className="w-16 h-16 object-contain drop-shadow-xl mb-3"
            />
            <h1 className="text-2xl font-black text-white tracking-tight text-center">
              Join NexEagle
            </h1>
            <p className="text-brand-100 font-medium text-xs mt-1 max-w-[80%] text-center opacity-90">
              {currentStep === 1 && "Select the access level that best matches your responsibilities"}
              {currentStep === 2 && "Secure your account with mobile verification"}
              {currentStep === 3 && "Set up email & password (optional)"}
            </p>
          </div>
        </div>

        {/* Mobile Bottom Sheet (Bottom Half) */}
        <div className="flex-1 bg-white dark:bg-slate-950 w-full -mt-6 rounded-t-[2rem] relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col">
          {/* Drag handle pill */}
          <div className="w-full flex justify-center pt-4 pb-2">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
          </div>
          
          <div className="px-6 pt-2 pb-4 flex justify-between items-center">
            <div className="text-lg font-bold bg-gradient-to-r from-brand-600 to-purple-600 bg-clip-text text-transparent">
              {currentStep === 1 && "Choose Your Role"}
              {currentStep === 2 && "Quick Verification"}
              {currentStep === 3 && "Account Setup"}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Step {currentStep} / 3</div>
              <Progress value={progressPercentage} className="w-12 h-1.5" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-8 w-full max-w-md mx-auto">
            {children}
          </div>
        </div>
      </div>

      {/* --- DESKTOP VIEW --- */}
      {/* Left Side - Promotional Content */}
      <div className="hidden lg:flex w-2/3 bg-gradient-to-br from-brand-600 via-purple-600 to-brand-700 p-8 items-center justify-center relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px)`,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        
        <div className="text-white max-w-3xl relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <img 
              src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
              alt="NexEagle Logo" 
              className="h-16 w-16 object-contain drop-shadow-xl"               
            />
            <h1 className="text-4xl font-bold tracking-tight">Join NexEagle</h1>
          </div>
          
          <h2 className="text-2xl font-medium leading-relaxed mb-6">
            The most advanced Hospital Management System trusted by thousands of healthcare professionals worldwide
          </h2>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="hidden lg:flex w-1/3 items-center justify-center p-6 flex-1 overflow-y-auto bg-slate-50 dark:bg-gray-950">
        <Card className="w-full max-w-md shadow-elegant border-slate-200/60 dark:border-slate-800">
          <CardHeader className="text-center space-y-2 pb-3 pt-4 relative">
            {/* Back Arrow Button */}
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
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            
            <div className="flex items-center justify-end">
              <div className="text-right">
                <div className="text-xs text-muted-foreground mb-0.5 font-medium">Step {currentStep} of 3</div>
                <Progress value={progressPercentage} className="w-16 h-1.5" />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-center mb-2">
                <img src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" alt="Company Logo" className="h-12 w-12 object-contain drop-shadow-md" />
              </div>
              
              <CardTitle className="text-xl font-bold tracking-tight">
                {currentStep === 1 && "Choose Your Role"}
                {currentStep === 2 && "Quick Verification"}
                {currentStep === 3 && "Account Setup"}
              </CardTitle>
              
              <p className="text-muted-foreground text-sm leading-relaxed">
                {currentStep === 1 && "Select the access level that best matches your responsibilities"}
                {currentStep === 2 && "Secure your account with mobile verification"}
                {currentStep === 3 && "Set up email & password (optional)"}
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="px-8 pb-8">
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 