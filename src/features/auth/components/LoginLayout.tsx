import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';

interface LoginLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showPromotionalBanner?: boolean;
  promotionalContent?: React.ReactNode;
  isLoading?: boolean;
  loadingMessage?: string;
}

export const LoginLayout: React.FC<LoginLayoutProps> = ({
  children,
  title,
  subtitle,
  showPromotionalBanner = true,
  promotionalContent,
  isLoading = false,
  loadingMessage = "Signing you in..."
}) => {
  const defaultPromotionalContent = (
    <div className="text-white max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <img 
          src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
          alt="Company Logo" 
          className="h-12 w-12" 
          style={{ width: '48px', height: '48px' }} 
        />
        <h1 className="text-3xl font-bold">NexEagle HMS</h1>
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
  );

  return (
    <div className="h-screen bg-gradient-subtle flex flex-col lg:flex-row overflow-hidden relative">
      {/* Loading Overlay */}
      <LoadingOverlay isLoading={isLoading} message={loadingMessage} />
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-center gap-2">
          <img 
            src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
            alt="Company Logo" 
            className="h-6 w-6"
            style={{ width: '24px', height: '24px' }}
          />
          <span className="font-bold text-base">NexEagle HMS</span>
        </div>
      </div>

      {/* Desktop Promotional Banner (2/3) */}
      {showPromotionalBanner && (
        <div className="hidden lg:flex w-2/3 bg-gradient-primary items-center justify-center p-8">
          {promotionalContent || defaultPromotionalContent}
        </div>
      )}

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
              {title}
            </CardTitle>
            {subtitle && (
              <p className="text-muted-foreground text-sm">
                {subtitle}
              </p>
            )}
          </CardHeader>
          
          <CardContent className="px-6 pb-6">
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 