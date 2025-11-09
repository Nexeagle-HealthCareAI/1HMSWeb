import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslation } from 'react-i18next';

import { 
  Users,
  Calendar,
  DollarSign,
  Star,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  UserCheck,
  FileText,
  Download,
  Search,
  Filter,
  Bell,
  Settings,
  LogOut,
  MoreVertical,
  Eye,
  Building2,
  Stethoscope,
  Shield,
  CreditCard,
  BarChart3,
  Cog,
  ShieldCheck,
  X,
  User,
  CheckCircle2,
  ArrowRight,
  MessageSquare
} from 'lucide-react';
import { 
  DashboardOverview,
  UserManagementModule,
  PatientManagementModule,
} from './index';
// Removed ProfileCompletionBanner from Admin panel
import { useHospitalApi } from '@/hooks/useApi';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { SystemConfigModule } from './SystemConfigModule';



export const AdminDashboard = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [dateFilter, setDateFilter] = useState('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showHospitalRegistrationDialog, setShowHospitalRegistrationDialog] = useState(false);

  // Fetch hospital profile status and compute completion from API
  const authStoreRef = useAuthStore.getState();
  const hospitalId = authStoreRef.getHospitalId() || '';
  const { data: hospitalData } = useHospitalApi.getHospitalById(hospitalId);
  const hospitalScore = hospitalData?.profileStatus?.profileCompletionPercent ?? 0;
  const isBasicInfoComplete = hospitalData?.profileStatus?.isBasicInfoComplete ?? false;
  const isLocationInfoComplete = hospitalData?.profileStatus?.isLocationInfoComplete ?? false;
  const isContactInfoComplete = hospitalData?.profileStatus?.isContactInfoComplete ?? false;
  const accessUnlocked = isBasicInfoComplete && isLocationInfoComplete; // allow admin access if both true

  const authStore = useAuthStore.getState();
  const userRole = authStore.getUserRole() || 'Admin';
  const hospitalAccessRestricted = useAuthStore(state => state.hospitalAccessRestricted);
  const hospitalAccessMessage = useAuthStore(state => state.hospitalAccessMessage);
  const setHospitalAccessRestriction = useAuthStore(state => state.setHospitalAccessRestriction);

  // Show Hospital Registration Dialog when admin lands on admin board and hospital is not 100% complete
  useEffect(() => {
    if (hospitalScore < 100 && !bannerDismissed) {
      setShowHospitalRegistrationDialog(true);
    }
  }, [hospitalScore, bannerDismissed]);

useEffect(() => {
  if (hospitalScore >= 100) {
    if (hospitalAccessRestricted) {
      setHospitalAccessRestriction(false, null);
    }
    if (showHospitalRegistrationDialog) {
      setShowHospitalRegistrationDialog(false);
    }
    if (!bannerDismissed) {
      setBannerDismissed(true);
    }
  }
}, [hospitalScore, hospitalAccessRestricted, setHospitalAccessRestriction, showHospitalRegistrationDialog, bannerDismissed]);

  // Auto-scroll to Hospital Branding section when navigating to hospital config
  useEffect(() => {
    if (currentView === 'system-config-hospital') {
      // Use a timeout to ensure the component has rendered and tab has switched
      const timer = setTimeout(() => {
        // Try to find the Hospital Branding content first (since the tab should be active)
        const hospitalBrandingContent = document.querySelector('[data-testid="hospital-branding-content"]');
        const hospitalBrandingTab = document.querySelector('[data-testid="hospital-branding-tab"]');
        const systemConfigModule = document.querySelector('[data-module="system-config-hospital"]');
        
        // Priority order: content section, then tab, then module
        const targetElement = hospitalBrandingContent || hospitalBrandingTab || systemConfigModule;
        
        if (targetElement) {
          targetElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest' 
          });
        }
      }, 500); // Allow extra time for tab switching and rendering

      return () => clearTimeout(timer);
    }
  }, [currentView]);



  const focusHospitalBranding = useCallback(() => {
    setCurrentView('system-config-hospital');
    sessionStorage.setItem('admin-focus-tab', 'hospital');
    requestAnimationFrame(() => {
      const event = new CustomEvent('dashboard:navigate', {
        detail: { view: 'system-config-hospital', focusTab: 'hospital' },
      });
      window.dispatchEvent(event);
    });
  }, [setCurrentView]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">{t('admin.confirmed')}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">{t('admin.pending')}</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">{t('admin.cancelled')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderKPICard = (title: string, icon: React.ReactNode, data: any, isCurrency = false) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs lg:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-lg lg:text-2xl font-bold">
              {isCurrency ? `$${data.value.toLocaleString()}` : data.value.toLocaleString()}
            </p>
          </div>
          <div className="p-2 lg:p-3 bg-primary/10 rounded-full ml-2">
            {icon}
          </div>
        </div>
        <div className="flex items-center mt-2 lg:mt-4">
          {data.trend === 'up' ? (
            <TrendingUp className="h-3 w-3 lg:h-4 lg:w-4 text-green-500 mr-1" />
          ) : (
            <TrendingDown className="h-3 w-3 lg:h-4 lg:w-4 text-red-500 mr-1" />
          )}
          <span className={`text-xs lg:text-sm font-medium ${data.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {data.change > 0 ? '+' : ''}{data.change}%
          </span>
          <span className="text-xs lg:text-sm text-muted-foreground ml-1 hidden sm:inline">{t('admin.vsLastPeriod')}</span>
        </div>
      </CardContent>
    </Card>
  );

  const adminModules = [
    { id: 'dashboard', name: t('admin.dashboard'), icon: Activity, description: t('admin.overviewAnalytics') },
    { id: 'user-management', name: t('admin.userManagement'), icon: Shield, description: t('admin.usersRolesPermissions') },
    { id: 'patient-management', name: t('admin.patientManagement'), icon: Users, description: t('admin.patientRecordsData') },
//{ id: 'appointment-oversight', name: t('admin.appointmentOversight'), icon: Calendar, description: t('admin.appointmentManagement') },
    //{ id: 'billing-insurance', name: t('admin.billingInsurance'), icon: CreditCard, description: t('admin.financialManagement') },
//{ id: 'bulk-messaging', name: t('admin.bulkMessaging'), icon: MessageSquare, description: t('admin.communicationManagement') },
    { id: 'system-config', name: t('admin.systemConfiguration'), icon: Cog, description: t('admin.hospitalSettings') },
   // { id: 'audit-security', name: t('admin.auditSecurity'), icon: ShieldCheck, description: t('admin.logsSecurity') }
  ];



  return (
    <div className="min-h-screen w-full p-4 lg:p-6 space-y-6 bg-gradient-subtle relative z-0">
      {/* Hospital Registration Progress Dialog/Popup */}
      <Dialog 
        open={showHospitalRegistrationDialog} 
        onOpenChange={(open) => {
          // Only allow closing explicitly through button clicks, not outside clicks
          if (!open) {
            setBannerDismissed(true);
            setShowHospitalRegistrationDialog(false);
          }
        }}
      >
        <DialogContent 
          className="max-w-[95vw] sm:max-w-md md:max-w-lg lg:max-w-2xl w-full mx-4"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-4 sm:p-5 md:p-6">
            {/* Header Section - Stack on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div className="flex items-center gap-3 sm:gap-4 flex-1">
                <div className="p-2 sm:p-3 bg-blue-600 rounded-full flex-shrink-0">
                  <Building2 className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-bold text-blue-900 dark:text-blue-100">
                    {t('admin.hospitalRegistrationProgress')}
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 mt-0.5">
                    {t('admin.completeHospitalDetails')}
                  </p>
                </div>
              </div>
              <div className="text-center sm:text-right flex-shrink-0">
                <div className="text-3xl sm:text-4xl font-bold text-blue-600 mb-0.5">{hospitalScore}%</div>
                <div className="text-xs sm:text-sm text-blue-500 uppercase tracking-wide">{t('admin.complete')}</div>
              </div>
            </div>
            
            {/* Progress Bar Section */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-200">{t('admin.progress')}</span>
                <span className="text-xs sm:text-sm text-blue-600">{hospitalScore}/100%</span>
              </div>
              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-3 sm:h-4 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-blue-500 h-3 sm:h-4 rounded-full transition-all duration-500 ease-out relative"
                  style={{ width: `${hospitalScore}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                </div>
              </div>
            </div>
            
            {/* Footer Section - Stack on mobile */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                {!accessUnlocked ? (
                  <>
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500 flex-shrink-0" />
                    <span className="text-red-700 dark:text-red-300 font-medium">
                      {t('admin.adminFeaturesLocked')}
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500 flex-shrink-0" />
                    <span className="text-green-700 dark:text-green-300 font-medium">
                      {t('admin.basicFeaturesUnlocked')}
                    </span>
                  </>
                )}
              </div>
              
              <Button 
                onClick={() => {
                  setShowHospitalRegistrationDialog(false);
                  setBannerDismissed(true);
                  setCurrentView('system-config-hospital');
                }} 
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 sm:px-6 py-2 text-sm sm:text-base"
              >
                <span className="hidden sm:inline">
                  {!accessUnlocked ? t('admin.completeHospitalInfo') : t('admin.updateHospitalDetails')}
                </span>
                <span className="sm:hidden">
                  {!accessUnlocked ? 'Complete Info' : 'Update Details'}
                </span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold mb-4">{t('admin.setupComplete')}</h2>
            <p className="text-muted-foreground mb-6">
              {t('admin.welcomeToNexEagle')}
            </p>
            <Button onClick={() => setShowSetupDialog(false)}>
              {t('admin.getStarted')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Compact Top Navigation */}
      <div className="flex items-center gap-2 sm:gap-3 mb-4">
        <h1 className="text-xl lg:text-2xl font-bold text-foreground">{t('admin.adminBoard')}</h1>
        {hospitalAccessRestricted && (
          <button
            type="button"
            onClick={focusHospitalBranding}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] sm:text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-primary/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-[9px] font-bold text-primary">
              {Math.round(hospitalScore)}
            </span>
            <span className="hidden sm:inline">{hospitalAccessMessage || 'Complete hospital information to unlock full access.'}</span>
            <span className="sm:hidden">{Math.round(hospitalScore)}%</span>
          </button>
        )}
        {hospitalScore === 100 && (
          <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t('admin.hospitalSetup100')}
          </Badge>
        )}
      </div>

      {/* Enhanced Navigation Tabs - Mobile Optimized */}
      <div className="relative mb-4 sm:mb-6">
        {/* Mobile: Horizontal Scrollable Tabs */}
        <div className="border-b border-border/60 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm rounded-t-lg sm:rounded-lg overflow-visible">
          <div 
            className="flex gap-1 sm:gap-1.5 overflow-x-auto scrollbar-hide px-2 sm:px-3 py-2 sm:py-2.5 snap-x snap-mandatory" 
            style={{ 
              WebkitOverflowScrolling: 'touch',
              scrollBehavior: 'smooth',
              overflowX: 'auto',
              overflowY: 'hidden'
            }}
          >
            {adminModules.map((module) => {
              const isLocked = !accessUnlocked && module.id !== 'dashboard' && module.id !== 'system-config';
              const isActive = currentView === module.id;
              
              return (
                <button
                  key={module.id}
                  onClick={() => {
                    if (!isLocked) {
                      setCurrentView(module.id);
                    } else {
                      toast({
                        title: t('admin.featureLocked'),
                        description: t('admin.completeHospitalRegistration'),
                        variant: "destructive"
                      });
                    }
                  }}
                  disabled={isLocked}
                  className={`
                    group relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 
                    text-[10px] sm:text-xs md:text-sm font-medium transition-all duration-300 ease-out
                    rounded-lg sm:rounded-lg whitespace-nowrap flex-shrink-0 snap-start
                    min-w-[max-content] sm:min-w-auto
                    ${isLocked 
                      ? 'opacity-40 cursor-not-allowed text-muted-foreground' 
                      : isActive
                        ? 'text-primary bg-primary/10 shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/70 active:scale-95'
                    }
                  `}
                >
                  {/* Active indicator background */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 rounded-lg -z-0" />
                  )}
                  
                  {/* Icon with smooth transitions */}
                  <div className={`
                    relative z-10 transition-transform duration-300 flex-shrink-0
                    ${isActive ? 'scale-110' : 'group-hover:scale-105'}
                  `}>
                    <module.icon className={`
                      h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-[18px] md:w-[18px] transition-colors duration-200
                      ${isLocked 
                        ? 'text-muted-foreground' 
                        : isActive
                          ? 'text-primary'
                          : 'text-muted-foreground group-hover:text-foreground'
                      }
                    `} />
                  </div>
                  
                  {/* Label - Responsive text */}
                  <span className={`
                    relative z-10 transition-colors duration-200
                    ${isLocked 
                      ? 'text-muted-foreground' 
                      : isActive
                        ? 'text-primary font-semibold'
                        : 'text-muted-foreground group-hover:text-foreground'
                    }
                  `}>
                    {/* Show full name on sm+ screens, abbreviated on mobile */}
                    <span className="hidden sm:inline">{module.name}</span>
                    <span className="sm:hidden">
                      {module.id === 'system-config' 
                        ? 'System Config' 
                        : module.name.split(' ')[0]
                      }
                    </span>
                  </span>
                  
                  {/* Locked indicator */}
                  {isLocked && (
                    <div className="relative z-10 flex items-center flex-shrink-0">
                      <X className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-500 ml-0.5 sm:ml-1" />
                    </div>
                  )}
                  
                  {/* Active bottom border indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-0.5 bg-primary rounded-full shadow-sm shadow-primary/50" />
                  )}
                  
                  {/* Hover effect */}
                  {!isLocked && !isActive && (
                    <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Mobile: Scroll indicator gradients - Always visible to indicate scrollability */}
        <div className="absolute left-0 top-0 bottom-0 w-6 sm:w-8 bg-gradient-to-r from-background via-background/80 to-transparent pointer-events-none sm:hidden" />
        <div className="absolute right-0 top-0 bottom-0 w-6 sm:w-8 bg-gradient-to-l from-background via-background/80 to-transparent pointer-events-none sm:hidden" />
        
        {/* Desktop: Subtle gradient overlay at edges */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none hidden sm:block" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none hidden sm:block" />
      </div>

      {/* Dashboard Content */}
      {currentView === 'dashboard' && (
        <DashboardOverview 
          renderKPICard={renderKPICard}
          getStatusBadge={getStatusBadge}
        />
      )}

      {/* User Management Module */}
      {currentView === 'user-management' && <UserManagementModule />}

      {/* Patient Management Module */}
      {currentView === 'patient-management' && <PatientManagementModule />}
 
 {/* System Configuration Module */}
{(currentView === 'system-config' || currentView === 'system-config-hospital') && (
  <div data-module={currentView === 'system-config-hospital' ? 'system-config-hospital' : 'system-config'}>
    <SystemConfigModule focusTab={currentView === 'system-config-hospital' ? 'hospital' : undefined} />
  </div>
)}
    </div>
  );
};
