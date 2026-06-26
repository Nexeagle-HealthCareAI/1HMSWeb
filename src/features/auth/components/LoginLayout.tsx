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

      <div className="relative rounded-2xl p-6 border border-white/10 shadow-2xl overflow-hidden bg-white/5 backdrop-blur-md">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-emerald-500/20 blur-[100px] rounded-full pointer-events-none" />

        <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-white relative z-10">
          <div className="p-2 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 rounded-lg border border-emerald-500/20 shadow-inner">
            <Shield className="w-5 h-5 text-emerald-400" />
          </div>
          Why you can trust us
        </h3>

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 relative z-10"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
                delayChildren: 0.1
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
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                visible: { 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  transition: { type: "spring", stiffness: 100, damping: 15 }
                }
              }}
              whileHover={{ 
                scale: 1.03, 
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderColor: "rgba(52, 211, 153, 0.4)",
                boxShadow: "0 10px 30px -10px rgba(52, 211, 153, 0.2)"
              }}
              className="group relative bg-white/5 p-4 rounded-xl border border-white/5 backdrop-blur-lg flex flex-col gap-3 transition-all duration-300 cursor-default shadow-lg overflow-hidden"
            >
              {/* Premium gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-emerald-500/0 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="bg-gradient-to-br from-emerald-400/10 to-emerald-600/10 p-2.5 rounded-lg w-fit shadow-inner border border-emerald-500/10 group-hover:border-emerald-400/30 transition-colors">
                <item.icon className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors drop-shadow-md" />
              </div>
              <span className="text-[13px] text-white/90 leading-relaxed font-medium tracking-wide relative z-10 group-hover:text-white transition-colors">{item.text}</span>
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