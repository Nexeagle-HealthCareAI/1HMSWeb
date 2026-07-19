import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { useTranslation } from 'react-i18next';
import { Check, Shield, Activity, Lock, Database, FileText, GraduationCap, Users, Code, Calendar, HardDrive } from 'lucide-react';
import { motion } from 'framer-motion';

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

  // Helper function to render company name with "1HMS" highlighted
  const renderCompanyName = (companyName: string, textColorClass: string = '', fontSize: string = '') => {
    const parts = companyName.split(' 1HMS');
    if (parts.length === 2) {
      return (
        <span className={`${textColorClass} ${fontSize}`}>
          {parts[0]} <span className="text-healthcare-primary">1HMS</span>
        </span>
      );
    }
    return <span className={`${textColorClass} ${fontSize}`}>{companyName}</span>;
  };

  // Helper function to render title with "1HMS" highlighted
  const renderTitle = (titleText: string) => {
    const parts = titleText.split(' 1HMS');
    if (parts.length === 2) {
      return (
        <>
          {parts[0]} <span className="text-healthcare-primary">1HMS</span>
        </>
      );
    }
    return titleText;
  };

  const defaultPromotionalContent = (
    <div className="text-white">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-shrink-0">
          <img
            src="/Logo.png"
            alt="NexEagle Logo"
            className="h-12 w-12 object-contain"
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">NexEagle</h1>
          <p className="text-brand-200 text-xs font-medium tracking-wide">HEALTHCARE EXCELLENCE</p>
        </div>
      </div>

      <h2 className="text-3xl font-bold mb-4 leading-tight bg-gradient-to-r from-white via-brand-100 to-brand-200 bg-clip-text text-transparent">
        {t('loginLayout.tagline')}
      </h2>

      <p className="text-sm text-brand-100/90 mb-6 leading-relaxed font-normal max-w-xl">
        {t('loginLayout.description')}
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-lg p-3 hover:bg-white/15 transition-all duration-300">
          <div className="text-2xl font-bold text-white mb-0.5">99.9%</div>
          <div className="text-xs text-brand-200 font-medium uppercase tracking-wider">{t('loginLayout.uptime')}</div>
        </div>

        <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-lg p-3 hover:bg-white/15 transition-all duration-300">
          <div className="text-2xl font-bold text-white mb-0.5">24/7</div>
          <div className="text-xs text-brand-200 font-medium uppercase tracking-wider">{t('loginLayout.support')}</div>
        </div>
      </div>
    </div>
  );

    return (
    <div className="h-[100dvh] bg-slate-50 dark:bg-gray-950 flex flex-col lg:flex-row overflow-hidden relative transition-all duration-300">
      {/* Loading Overlay */}
      <LoadingOverlay isLoading={isLoading} message={loadingMessage || defaultLoadingMessage} />

      {/* --- MOBILE VIEW --- */}
      <div className="flex lg:hidden flex-col h-full w-full relative">
        {/* Mobile Hero (Top Half) */}
        <div className="h-[45%] w-full bg-gradient-to-br from-brand-600 via-brand-500 to-blue-600 relative overflow-hidden flex flex-col items-center justify-center pt-8 pb-12">
          {/* Ambient shapes */}
          <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-white/10 blur-[60px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-20%] w-[70%] h-[70%] rounded-full bg-blue-400/20 blur-[60px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center">
            <img
              src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png"
              alt="Company Logo"
              className="w-20 h-20 object-contain drop-shadow-xl mb-4"
            />
            <h1 className="text-3xl font-black text-white tracking-tight text-center">
              {renderTitle(title)}
            </h1>
            <p className="text-brand-100 font-medium text-sm mt-2 max-w-[80%] text-center opacity-90">
              {subtitle || t('loginLayout.tagline')}
            </p>
          </div>
        </div>

        {/* Mobile Bottom Sheet (Bottom Half) */}
        <div className="flex-1 bg-white dark:bg-slate-950 w-full -mt-8 rounded-t-[2.5rem] relative z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col">
          {/* Drag handle pill */}
          <div className="w-full flex justify-center pt-4 pb-2">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
          </div>
          
          <div className="flex-1 overflow-y-auto px-6 pb-8 pt-4 w-full max-w-md mx-auto">
            {children}
          </div>
        </div>
      </div>

      {/* --- DESKTOP VIEW --- */}
      {showPromotionalBanner && (
        <div className="hidden lg:flex w-2/3 bg-gradient-primary flex-col justify-center p-6 overflow-y-auto">
          <div className="relative z-10 w-full max-w-2xl mx-auto my-auto py-8">
            {promotionalContent || defaultPromotionalContent}
          </div>
        </div>
      )}

      {/* Login Form - Desktop: 1/3 */}
      <div className="hidden lg:flex w-1/3 items-center justify-center p-6 flex-1 overflow-y-auto bg-slate-50 dark:bg-gray-950">
        <Card className="w-full max-w-md shadow-elegant border-slate-200/60 dark:border-slate-800">
          <CardHeader className="text-center space-y-3 pb-4">
            <div className="flex flex-col items-center justify-center mb-3">
              <img
                src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png"
                alt="Company Logo"
                className="h-14 w-auto object-contain mb-2 drop-shadow-md"
              />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              {renderTitle(title)}
            </CardTitle>
            {subtitle && (
              <p className="text-muted-foreground text-sm font-medium">
                {subtitle}
              </p>
            )}
          </CardHeader>

          <CardContent className="px-8 pb-8">
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};