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

      <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 shadow-2xl">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white">
          <div className="p-1.5 bg-emerald-500/20 rounded-md">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          Why you can trust us
        </h3>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-2"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
        >
          {[
            { icon: Activity, text: "Designed for real OPD workflows (queue, follow-ups)" },
            { icon: Lock, text: "Secure patient records with controlled access" },
            { icon: Database, text: "Backup & recovery so your data is safe" },
            { icon: FileText, text: "Clear audit trail for edits and actions" },
            { icon: GraduationCap, text: "Training + onboarding for your staff" },
            { icon: Users, text: "Human support when you need it" },
            { icon: Code, text: "Built by healthcare-tech team working closely with clinics" },
            { icon: Calendar, text: "No long lock-in (monthly plans / data export anytime)" },
            { icon: HardDrive, text: "Data ownership (your data is yours; export on request)" }
          ].map((item, index) => (
            <motion.div
              key={index}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
              }}
              whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.25)" }}
              className="bg-white/20 p-2.5 rounded-lg border border-white/10 backdrop-blur-md flex items-center gap-3 transition-colors cursor-default shadow-sm"
            >
              <div className="mt-0 bg-emerald-500/30 p-1.5 rounded-md flex-shrink-0 shadow-inner">
                <item.icon className="w-3.5 h-3.5 text-emerald-300" />
              </div>
              <span className="text-xs text-white leading-snug font-medium tracking-wide shadow-black/10 text-shadow-sm">{item.text}</span>
            </motion.div>
          ))}
        </motion.div>
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
        <div className="hidden lg:flex w-2/3 bg-gradient-primary flex-col justify-center p-6 overflow-y-auto">
          <div className="relative z-10 w-full max-w-2xl mx-auto my-auto py-8">
            {promotionalContent || defaultPromotionalContent}
          </div>
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