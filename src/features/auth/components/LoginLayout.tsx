import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { useTranslation } from 'react-i18next';

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
  loadingMessage
}) => {
  const { t } = useTranslation();
  const defaultLoadingMessage = t('loginLayout.signingIn');

  // Helper function to render company name with "easyHMS" in blue
  const renderCompanyName = (companyName: string, textColorClass: string = '', fontSize: string = '') => {
    const parts = companyName.split(' easyHMS');
    if (parts.length === 2) {
      return (
        <span className={`${textColorClass} ${fontSize}`}>
          {parts[0]} <span className="text-healthcare-primary">easyHMS</span>
        </span>
      );
    }
    return <span className={`${textColorClass} ${fontSize}`}>{companyName}</span>;
  };

  // Helper function to render title with "easyHMS" in blue
  const renderTitle = (titleText: string) => {
    const parts = titleText.split(' easyHMS');
    if (parts.length === 2) {
      return (
        <>
          {parts[0]} <span className="text-healthcare-primary">easyHMS</span>
        </>
      );
    }
    return titleText;
  };

    const defaultPromotionalContent = (
    <div className="text-white max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <img
          src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png"
          alt="Company Logo"
          className="h-12 w-12"
          style={{ width: '48px', height: '48px' }}
        />
        <h1 className="text-3xl font-bold text-white">{t('loginLayout.companyName')}</h1>
      </div>
      
      <h2 className="text-xl font-semibold mb-4">
        {t('loginLayout.tagline')}
      </h2>
      
      <p className="text-lg opacity-90 mb-6 leading-relaxed">
        {t('loginLayout.description')}
      </p>
      
      <div className="grid grid-cols-2 gap-6 mt-8">
        <div className="text-center">
          <div className="text-2xl font-bold">99.9%</div>
          <div className="text-sm opacity-75">{t('loginLayout.uptime')}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">10K+</div>
          <div className="text-sm opacity-75">{t('loginLayout.doctors')}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">50M+</div>
          <div className="text-sm opacity-75">{t('loginLayout.patients')}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">24/7</div>
          <div className="text-sm opacity-75">{t('loginLayout.support')}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-gradient-subtle dark:bg-gray-950 flex flex-col lg:flex-row overflow-hidden relative transition-all duration-300">
      {/* Loading Overlay */}
      <LoadingOverlay isLoading={isLoading} message={loadingMessage || defaultLoadingMessage} />
      {/* Mobile Header */}
      <div className="lg:hidden bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex-shrink-0">
        <div className="flex items-center justify-center gap-2">
          <img 
            src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
            alt="Company Logo" 
            className="h-6 w-6"
            style={{ width: '24px', height: '24px' }}
          />
          {renderCompanyName(t('loginLayout.companyName'), 'font-bold text-base text-gray-900 dark:text-white')}
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
            <div className="hidden lg:flex flex-col items-center justify-center mb-3">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl mb-2">
                <img 
                  src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" 
                  alt="Company Logo" 
                  className="h-12 w-12" 
                  style={{ width: '60px', height: '50px' }}
                />
              </div>             
            </div>
            <CardTitle className="text-xl lg:text-3xl font-bold">
              {renderTitle(title)}
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