import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';

import { CityMap } from './CityMap';
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
  Map as MapIcon,
  Stethoscope,
  PieChart,
  Shield,
  CreditCard,
  BarChart3,
  Cog,
  ShieldCheck,
  X,
  User,
  CheckCircle2,
  ArrowRight,
  Ban,
  MessageSquare,
  LayoutDashboard,
  Receipt,
  Copy,
  IndianRupee
} from 'lucide-react';
import {
  UserManagementModule,
  PatientManagementModule,
} from './index';
// Removed ProfileCompletionBanner from Admin panel
import { useHospitalApi } from '@/hooks/useApi';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { SystemConfigModule } from './SystemConfigModule';
// @ts-ignore
// import { BillingDashboard } from '@/features/billing/pages/BillingDashboard';
import { AnalyticsResponse, fetchAnalyticsData } from '../services/analyticsApi';





export const AdminDashboard = () => {

  const { toast } = useToast();
  const { t } = useTranslation();
  const hospitalId = useAuthStore(state => state.hospitalId) ?? '';
  // Fix: Ensure setCurrentView is defined
  const [dateFilter, setDateFilter] = useState('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const [showHospitalRegistrationDialog, setShowHospitalRegistrationDialog] = useState(false);

  const [analyticsData, setAnalyticsData] = useState<AnalyticsResponse['data'] | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [ageDistributionFilter, setAgeDistributionFilter] = useState<'overall' | 'Male' | 'Female'>('overall');

  const fetchDashboardData = useCallback(async (isBackground = false) => {
    if (!hospitalId) return;

    if (!isBackground) {
      setLoadingAnalytics(true);
    }

    try {
      const response = await fetchAnalyticsData(hospitalId);
      if (response.success) {
        setAnalyticsData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Only show error toast on explicit user-triggered loads or initial loads
      if (!isBackground) {
        toast({
          title: t('errors.genericError'),
          description: t('errors.failedToFetchAnalytics'),
          variant: 'destructive',
        });
      }
    } finally {
      if (!isBackground) {
        setLoadingAnalytics(false);
      }
    }
  }, [hospitalId, t, toast]);

  useEffect(() => {
    if (currentView === 'dashboard') {
      // Initial load
      fetchDashboardData(false);

      // Auto-refresh every 5 minutes (300,000 ms)
      const intervalId = setInterval(() => {
        fetchDashboardData(true);
      }, 5 * 60 * 1000);

      return () => clearInterval(intervalId);
    }
  }, [currentView, fetchDashboardData]);

  // Fetch hospital profile status and compute completion from API
  const {
    data: hospitalData,
    isLoading: hospitalLoading,
    isFetching: hospitalFetching,
    isError: hospitalError
  } = useHospitalApi.getHospitalById(hospitalId);
  const hospitalScore = hospitalData?.profileStatus?.profileCompletionPercent ?? 0;
  const isBasicInfoComplete = hospitalData?.profileStatus?.isBasicInfoComplete ?? false;
  const isLocationInfoComplete = hospitalData?.profileStatus?.isLocationInfoComplete ?? false;
  const isContactInfoComplete = hospitalData?.profileStatus?.isContactInfoComplete ?? false;
  const accessUnlocked = isBasicInfoComplete && isLocationInfoComplete; // allow admin access if both true
  const hasCompletedHospitalProfileFetch = !!hospitalId && !hospitalLoading && !hospitalFetching;

  const userRole = useAuthStore(state => state.userRole) ?? 'Admin';
  const hospitalAccessRestricted = useAuthStore(state => state.hospitalAccessRestricted);
  const hospitalAccessMessage = useAuthStore(state => state.hospitalAccessMessage);
  const setHospitalAccessRestriction = useAuthStore(state => state.setHospitalAccessRestriction);
  const isAdminRole = userRole === 'Admin' || userRole === 'AdminDoctor';
  const shouldShowPopupForIncompleteProfile = hasCompletedHospitalProfileFetch && hospitalScore < 100;
  const shouldShowPopupForMissingHospital = isAdminRole && hospitalAccessRestricted && (!hospitalId || (!hospitalData && (hospitalError || hasCompletedHospitalProfileFetch)));
  const shouldShowHospitalPopup = !bannerDismissed && (shouldShowPopupForIncompleteProfile || shouldShowPopupForMissingHospital);
  const dashboardRootRef = useRef<HTMLDivElement | null>(null);

  // Show Hospital Registration Dialog when admin lands on admin board and hospital is not 100% complete
  useEffect(() => {
    if (shouldShowHospitalPopup) {
      setShowHospitalRegistrationDialog(true);
    }
  }, [shouldShowHospitalPopup]);

  useEffect(() => {
    if (!hasCompletedHospitalProfileFetch) return;
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
  }, [hasCompletedHospitalProfileFetch, hospitalScore, hospitalAccessRestricted, setHospitalAccessRestriction, showHospitalRegistrationDialog, bannerDismissed]);



  const adminModules = [
    { id: 'dashboard', name: t('admin.dashboard'), icon: LayoutDashboard, description: t('admin.overviewAnalytics') },
    { id: 'user-management', name: t('admin.userManagement'), icon: Users, description: t('admin.usersRolesPermissions') },
    { id: 'patient-management', name: t('admin.patientManagement'), icon: UserCheck, description: t('admin.patientRecordsData') },
    //{ id: 'appointment-oversight', name: t('admin.appointmentOversight') || 'Appointments', icon: Calendar, description: t('admin.appointmentManagement') || 'Manage System Appointments' },
    { id: 'billing-management', name: t('admin.billingManagement') || 'Billing Management', icon: IndianRupee, description: t('admin.billingDescription') || 'Manage all OPD, IPD billings' },
    //{ id: 'billing-insurance', name: t('admin.billingInsurance'), icon: CreditCard, description: t('admin.financialManagement') },
    //{ id: 'bulk-messaging', name: t('admin.bulkMessaging'), icon: MessageSquare, description: t('admin.communicationManagement') },
    { id: 'system-config', name: 'Settings', icon: Settings, description: 'General system preferences' },
    // { id: 'audit-security', name: t('admin.auditSecurity'), icon: ShieldCheck, description: t('admin.logsSecurity') }
  ];

  // Unused profile checklist and executive insights removed for clarity

  const handleCopyHospitalId = useCallback(async () => {
    if (!hospitalId) {
      return;
    }

    const copyFallback = () => {
      const textArea = document.createElement('textarea');
      textArea.value = hospitalId;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    };

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(hospitalId);
      } else {
        copyFallback();
      }
    } catch (error) {
      console.error('Unable to copy hospital ID:', error);
      toast({
        title: t('admin.copyFailed') || 'Copy failed',
        description: t('admin.copyFailedDescription') || 'Please copy the hospital ID manually.',
        variant: 'destructive'
      });
    }
  }, [hospitalId, toast, t]);

  const focusHospitalBranding = useCallback(() => {
    setCurrentView('system-config-hospital');
  }, [setCurrentView]);





  return (
    <div ref={dashboardRootRef} className={`min-h-screen w-full bg-gray-50 dark:bg-gray-950 relative z-0 pt-1 ${(currentView === 'system-config' || currentView === 'system-config-hospital') ? 'px-0 pb-0' : 'px-2 sm:px-4 lg:px-6 pb-2 sm:pb-4 lg:pb-6 space-y-4 sm:space-y-6'}`}>
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
                  {!accessUnlocked ? t('admin.cta.completeInfo') : t('admin.cta.updateDetails')}
                </span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Setup Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="w-[92vw] sm:w-full sm:max-w-4xl max-h-[90vh] overflow-auto px-2 sm:px-0">
          <div className="text-center py-6 sm:py-8 px-1 sm:px-0">
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




      {/* Enhanced Top Navigation with Hospital ID and Modernized Nav Tabs - Mobile Optimized */}
      <section className={`mb-4 sticky top-0 z-40 ${(currentView === 'system-config' || currentView === 'system-config-hospital') ? 'mx-2 sm:mx-4 lg:mx-6' : ''}`}>
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-white/20 dark:border-slate-800 rounded-2xl shadow-lg shadow-blue-100/10 dark:shadow-black/20 px-3 py-3 sm:px-6 sm:py-4 ring-1 ring-black/5 dark:ring-white/5">
          {/* Left: Title, badges, hospital ID */}
          <div className="flex flex-col gap-1 min-w-0 shrink-0 w-full xl:w-auto">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">
                {t('admin.adminBoard')}
              </h1>
              {hospitalAccessRestricted && (
                <button
                  type="button"
                  onClick={focusHospitalBranding}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary shadow-sm hover:bg-primary/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-all"
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary">
                    {Math.round(hospitalScore)}
                  </span>
                  <span className="hidden sm:inline">{hospitalAccessMessage || t('admin.hospitalAccessFallback')}</span>
                  <span className="sm:hidden">{Math.round(hospitalScore)}%</span>
                </button>
              )}
              {hospitalScore === 100 && (
                <Badge className="bg-green-100 text-green-700 border-green-200 text-xs font-semibold shadow-sm px-2 py-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  {t('admin.hospitalSetup100')}
                </Badge>
              )}
            </div>
            {hospitalId && (
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground pl-1 mt-1 flex-wrap">
                <span className="font-medium text-foreground whitespace-nowrap">{t('admin.hospitalIdLabel')}</span>
                <span className="relative group">
                  <Badge variant="outline" className="font-mono text-primary border-primary/40 bg-primary/5 max-w-[160px] sm:max-w-none truncate cursor-pointer transition-all group-hover:bg-primary/10" onClick={handleCopyHospitalId} title={t('admin.copyHospitalId') || t('admin.hospitalIdCopySr')}>
                    {hospitalId}
                  </Badge>
                  <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 rounded bg-black/80 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                    {t('admin.copyHospitalId')}
                  </span>
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 ml-1 text-muted-foreground hover:text-foreground"
                  onClick={handleCopyHospitalId}
                  aria-label={t('admin.copyHospitalId') || t('admin.hospitalIdCopySr')}
                  tabIndex={0}
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span className="sr-only">{t('admin.hospitalIdCopySr')}</span>
                </Button>
              </div>
            )}
          </div>

          {/* Right: Navigation Tabs - Responsive Scroll Container */}
          <nav className="w-full xl:w-auto xl:flex-1 min-w-0 xl:ml-4 flex flex-nowrap overflow-x-auto gap-2 bg-white/80 dark:bg-slate-900/80 border border-gray-200/70 dark:border-slate-800 rounded-2xl p-1 shadow-inner shadow-white/60 dark:shadow-black/40 justify-start md:justify-end scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {adminModules.map((module) => {
              const isActive = currentView === module.id;
              const isLocked = !accessUnlocked && module.id !== 'dashboard' && module.id !== 'system-config';
              return (
                <button
                  key={module.id}
                  onClick={() => {
                    if (!isLocked) setCurrentView(module.id);
                    else toast({
                      title: t('admin.featureLocked'),
                      description: t('admin.completeHospitalRegistration'),
                      variant: 'destructive'
                    });
                  }}
                  disabled={isLocked}
                  aria-disabled={isLocked}
                  aria-pressed={isActive}
                  tabIndex={isLocked ? -1 : 0}
                  title={isLocked ? t('admin.adminFeaturesLocked') : module.description}
                  className={`group flex-1 flex flex-col items-center text-center sm:items-start sm:text-left gap-0.5 rounded-xl px-2.5 py-1.5 border transition-all duration-300 min-w-[80px] sm:min-w-[120px] ${isActive
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white border-transparent shadow-xl shadow-blue-500/30'
                    : 'bg-transparent border-transparent text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-slate-800/70 hover:text-gray-900 dark:hover:text-gray-200'
                    } ${isLocked ? 'opacity-40 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
                >
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 font-semibold w-full">
                    <span className={`p-1 rounded-lg ${isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-slate-800'}`}>
                      <module.icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : 'text-blue-500 dark:text-blue-400'}`} />
                    </span>
                    <span className="hidden sm:inline text-[12px] line-clamp-1">{module.name}</span>
                  </div>
                  <span className="sm:hidden text-[10px] font-medium w-full text-center line-clamp-1 leading-tight">{module.name}</span>
                  <p className={`hidden sm:block text-[10px] leading-snug w-full line-clamp-2 opacity-90 mt-0.5 ${isActive ? 'text-white/90' : 'text-gray-500 dark:text-gray-500'}`}>
                    {module.description}
                  </p>
                </button>
              );
            })}
          </nav>
        </div>
      </section>

      {currentView === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Total Visits Card - Detailed Breakdown */}
            <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 border-none text-white shadow-lg">
              <CardContent className="p-4 sm:p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-indigo-100 text-sm font-medium mb-1">{t('admin.totalVisits') || 'Total Visits'}</p>
                    <h3 className="text-3xl sm:text-4xl font-bold">{analyticsData?.kpis?.totalVisits?.overall?.toLocaleString() || '...'}</h3>
                  </div>
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                </div>

                {/* 2x3 Grid for Breakdown */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-2 text-xs sm:text-sm border-t border-indigo-400/30">
                  <div className="flex flex-col">
                    <span className="text-indigo-200 text-[10px] uppercase tracking-wide">Today</span>
                    <span className="font-semibold text-lg">{analyticsData?.kpis?.totalVisits?.byBucket?.today?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-indigo-200 text-[10px] uppercase tracking-wide">Yesterday</span>
                    <span className="font-semibold text-lg">{analyticsData?.kpis?.totalVisits?.byBucket?.yesterday?.toLocaleString() || 0}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-indigo-200 text-[10px] uppercase tracking-wide">Last 7 Days</span>
                    <span className="font-semibold text-lg">{analyticsData?.kpis?.totalVisits?.byBucket?.last7Days?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-indigo-200 text-[10px] uppercase tracking-wide">This Month</span>
                    <span className="font-semibold text-lg">{analyticsData?.kpis?.totalVisits?.byBucket?.thisMonth?.toLocaleString() || 0}</span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-indigo-200 text-[10px] uppercase tracking-wide">This Year</span>
                    <span className="font-semibold text-lg">{analyticsData?.kpis?.totalVisits?.byBucket?.thisYear?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-indigo-200 text-[10px] uppercase tracking-wide">Prev Year</span>
                    <span className="font-semibold text-lg">{analyticsData?.kpis?.totalVisits?.byBucket?.prevYear?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Unique Patients Card - Detailed Breakdown */}
            <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-100 dark:border-indigo-900/50 shadow-sm relative overflow-hidden">
              {/* Decorative background element */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200/20 dark:bg-indigo-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

              <CardContent className="p-4 sm:p-5 relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-indigo-900/70 dark:text-indigo-200/70 text-sm font-medium mb-1">Unique Patients</p>
                    <h3 className="text-3xl sm:text-4xl font-bold text-indigo-900 dark:text-indigo-50">{analyticsData?.kpis?.uniquePatients?.overall?.toLocaleString() || '...'}</h3>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-indigo-800/50 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-700/50">
                    <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
                  </div>
                </div>

                {/* 2x3 Grid for Breakdown */}
                <div className="grid grid-cols-2 gap-2 pt-2 text-xs sm:text-sm">
                  <div className="flex flex-col p-2.5 bg-white/60 dark:bg-black/20 rounded-lg border border-indigo-50/50 dark:border-indigo-800/30">
                    <span className="text-indigo-400 dark:text-indigo-300 text-[10px] uppercase tracking-wide font-bold">Today</span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-100 text-lg">{analyticsData?.kpis?.uniquePatients?.byBucket?.today?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex flex-col p-2.5 bg-white/60 dark:bg-black/20 rounded-lg border border-indigo-50/50 dark:border-indigo-800/30">
                    <span className="text-indigo-400 dark:text-indigo-300 text-[10px] uppercase tracking-wide font-bold">Yesterday</span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-100 text-lg">{analyticsData?.kpis?.uniquePatients?.byBucket?.yesterday?.toLocaleString() || 0}</span>
                  </div>

                  <div className="flex flex-col p-2.5 bg-white/60 dark:bg-black/20 rounded-lg border border-indigo-50/50 dark:border-indigo-800/30">
                    <span className="text-indigo-400 dark:text-indigo-300 text-[10px] uppercase tracking-wide font-bold">Last 7 Days</span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-100 text-lg">{analyticsData?.kpis?.uniquePatients?.byBucket?.last7Days?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex flex-col p-2.5 bg-white/60 dark:bg-black/20 rounded-lg border border-indigo-50/50 dark:border-indigo-800/30">
                    <span className="text-indigo-400 dark:text-indigo-300 text-[10px] uppercase tracking-wide font-bold">This Month</span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-100 text-lg">{analyticsData?.kpis?.uniquePatients?.byBucket?.thisMonth?.toLocaleString() || 0}</span>
                  </div>

                  <div className="flex flex-col p-2.5 bg-white/60 dark:bg-black/20 rounded-lg border border-indigo-50/50 dark:border-indigo-800/30">
                    <span className="text-indigo-400 dark:text-indigo-300 text-[10px] uppercase tracking-wide font-bold">This Year</span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-100 text-lg">{analyticsData?.kpis?.uniquePatients?.byBucket?.thisYear?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex flex-col p-2.5 bg-white/60 dark:bg-black/20 rounded-lg border border-indigo-50/50 dark:border-indigo-800/30">
                    <span className="text-indigo-400 dark:text-indigo-300 text-[10px] uppercase tracking-wide font-bold">Prev Year</span>
                    <span className="font-bold text-indigo-700 dark:text-indigo-100 text-lg">{analyticsData?.kpis?.uniquePatients?.byBucket?.prevYear?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* New vs Returning Card - Improved Visual */}
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-100 dark:border-blue-900/50 shadow-sm relative overflow-hidden">
              {/* Decorative background element */}
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-200/20 dark:bg-blue-500/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

              <CardContent className="p-5 relative z-10">
                <div className="flex flex-col h-full justify-between">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-blue-900/70 dark:text-blue-200/70 text-sm font-medium">New vs Returning</p>
                    <div className="p-1.5 bg-white/80 dark:bg-blue-900/30 rounded-lg">
                      <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex justify-between items-end mb-4 px-2">
                    {/* New Patients - Left Aligned */}
                    <div className="flex flex-col items-start">
                      <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        {analyticsData?.kpis?.newVsReturningPatients?.new?.percent ?? '..'}%
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm ring-2 ring-white dark:ring-blue-950"></div>
                        <span className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                          New <span className="opacity-70 font-normal">({analyticsData?.kpis?.newVsReturningPatients?.new?.count || 0})</span>
                        </span>
                      </div>
                    </div>

                    {/* Returning Patients - Right Aligned */}
                    <div className="flex flex-col items-end">
                      <span className="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                        {analyticsData?.kpis?.newVsReturningPatients?.returning?.percent ?? '..'}%
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs font-semibold text-cyan-800 dark:text-cyan-200">
                          Returning <span className="opacity-70 font-normal">({analyticsData?.kpis?.newVsReturningPatients?.returning?.count || 0})</span>
                        </span>
                        <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 shadow-sm ring-2 ring-white dark:ring-blue-950"></div>
                      </div>
                    </div>
                  </div>

                  {/* Segmented Progress Bar */}
                  <div className="w-full h-4 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden flex shadow-inner p-0.5 backdrop-blur-sm border border-blue-100 dark:border-blue-800/30">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-400 h-full rounded-l-full transition-all duration-1000 ease-out relative group"
                      style={{ width: `${analyticsData?.kpis?.newVsReturningPatients?.new?.percent || 0}%` }}
                      title={`New: ${analyticsData?.kpis?.newVsReturningPatients?.new?.percent || 0}%`}
                    ></div>
                    <div className="w-0.5 h-full bg-transparent"></div>
                    <div
                      className="bg-gradient-to-r from-cyan-400 to-cyan-500 h-full rounded-r-full transition-all duration-1000 ease-out relative group"
                      style={{ width: `${analyticsData?.kpis?.newVsReturningPatients?.returning?.percent || 0}%` }}
                      title={`Returning: ${analyticsData?.kpis?.newVsReturningPatients?.returning?.percent || 0}%`}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gender & City Stats Card */}
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border-emerald-100 dark:border-emerald-900/50 shadow-sm">
              <CardContent className="p-6">
                <div className="h-full flex flex-col justify-center">
                  <p className="text-emerald-900 dark:text-emerald-100 font-semibold mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5" /> Gender Demographics
                  </p>
                  <div className="space-y-4">
                    {analyticsData?.genderWise?.map((g, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${g.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'}`}></div>
                          <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">{g.gender}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-lg font-bold text-emerald-900 dark:text-emerald-100">{g.overallVisits.toLocaleString()}</span>
                          <span className="text-xs text-emerald-700 dark:text-emerald-300">Visits</span>
                        </div>
                      </div>
                    ))}
                    {!analyticsData && <div>Loading...</div>}
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Age Distribution Graph */}
            <Card className="xl:col-span-2 shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-2">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-indigo-500" />
                    {t('admin.ageDistribution') || 'Age Distribution'}
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({ageDistributionFilter === 'overall' ? 'Overall' : ageDistributionFilter})
                    </span>
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Patient demographics by age group</p>
                </div>
                {/* Filter Tabs */}
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 gap-1 self-start sm:self-auto overflow-x-auto max-w-full">
                  {(['overall', 'Male', 'Female'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setAgeDistributionFilter(filter)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap ${ageDistributionFilter === filter
                        ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    >
                      {filter === 'overall' ? 'All' : filter}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="h-[320px] sm:h-[350px]">
                {/* Custom CSS Bar Chart for Ages */}
                <div className="h-full w-full pt-8 pb-4 relative overflow-x-auto overflow-y-hidden">
                  {/* Background Grid Lines */}
                  <div className="absolute inset-x-0 bottom-4 top-8 flex flex-col justify-between pointer-events-none min-w-[300px]">
                    {[100, 75, 50, 25, 0].map((tick) => (
                      <div key={tick} className="w-full border-t border-gray-100 dark:border-gray-800 relative h-0">
                        <span className="absolute -left-0 -top-2 text-[10px] text-gray-300 dark:text-gray-600 hidden sm:block">{tick}%</span>
                      </div>
                    ))}
                  </div>

                  <div className="h-full flex items-end justify-between gap-2 sm:gap-4 relative z-10 pl-2 min-w-[300px]">
                    {analyticsData ? (() => {
                      // Determine which data to show based on filter
                      let dataToDisplay = analyticsData?.overall?.ageDistribution || {};
                      if (ageDistributionFilter !== 'overall' && analyticsData?.genderWise) {
                        const genderData = analyticsData.genderWise.find(g => g.gender === ageDistributionFilter);
                        if (genderData) {
                          dataToDisplay = genderData.ageDistribution;
                        }
                      }

                      // Render Chart
                      return Object.entries(dataToDisplay)
                        .sort(([rangeA], [rangeB]) => {
                          const startA = parseInt(rangeA.split('-')[0]) || 0;
                          const startB = parseInt(rangeB.split('-')[0]) || 0;
                          return startA - startB;
                        })
                        .map(([ageRange, count], idx) => {
                          // Normalize height (use the max of the selected dataset for better scaling)
                          const maxVal = Math.max(...Object.values(dataToDisplay));
                          const heightPercent = maxVal > 0 ? Math.max((count / maxVal) * 100, 5) : 5;

                          // Color based on filter
                          const barColorClass = ageDistributionFilter === 'Male'
                            ? 'bg-blue-500 dark:bg-blue-600'
                            : ageDistributionFilter === 'Female'
                              ? 'bg-pink-500 dark:bg-pink-600'
                              : 'bg-indigo-500 dark:bg-indigo-600';

                          return (
                            <div key={idx} className="flex flex-col items-center gap-1 flex-1 group min-w-[30px] h-full justify-end">
                              {/* Value Label (Always visible now) */}
                              <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 mb-1 opacity-80 transition-opacity">
                                {count}
                              </span>

                              {/* Bar */}
                              <div className="relative w-full max-w-[40px] bg-gray-100 dark:bg-gray-800 rounded-t-lg flex items-end overflow-visible group-hover:bg-gray-200 dark:group-hover:bg-gray-700 transition-colors h-full max-h-[85%]">
                                <div
                                  className={`w-full rounded-t-lg transition-all duration-700 ease-out relative ${barColorClass}`}
                                  style={{ height: `${heightPercent}%` }}
                                >
                                </div>
                              </div>
                              <span className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap mt-1">{ageRange}</span>
                            </div>
                          );
                        });
                    })() : <div className="w-full h-full flex items-center justify-center text-gray-400">Loading chart data...</div>}
                  </div>
                </div>
              </CardContent>
            </Card>



            {/* No Show Analytics Card (col-span-1) */}
            <Card className="shadow-sm border-gray-200 dark:border-gray-800 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-red-500" />
                  No Shows
                </CardTitle>
                <p className="text-xs text-gray-500">Missed appointments overview</p>
              </CardHeader>
              <CardContent className="p-4 flex flex-col justify-center h-full gap-6">
                {/* Overall No Show */}
                <div className="text-center">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white block">{analyticsData?.overall?.noShow || 0}</span>
                  <span className="text-xs text-red-500 font-medium bg-red-50 dark:bg-red-900/10 px-2 py-1 rounded-full">Overall Missed</span>
                </div>

                {/* Gender Breakdown */}
                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                  {/* Male */}
                  <div className="text-center">
                    <div className="mb-1 text-gray-400 text-xs uppercase tracking-wider">Male</div>
                    <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                      {analyticsData?.genderWise?.find(g => g.gender === 'Male')?.noShow || 0}
                    </span>
                  </div>
                  {/* Female */}
                  <div className="text-center border-l border-gray-100 dark:border-gray-800">
                    <div className="mb-1 text-gray-400 text-xs uppercase tracking-wider">Female</div>
                    <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                      {analyticsData?.genderWise?.find(g => g.gender === 'Female')?.noShow || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cancelled Appointments Analytics Card (col-span-1) */}
            <Card className="shadow-sm border-gray-200 dark:border-gray-800 flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Ban className="h-5 w-5 text-amber-500" />
                  Cancelled
                </CardTitle>
                <p className="text-xs text-gray-500">Cancelled appointments overview</p>
              </CardHeader>
              <CardContent className="p-4 flex flex-col justify-center h-full gap-6">
                {/* Overall Cancelled */}
                <div className="text-center">
                  <span className="text-3xl font-bold text-gray-900 dark:text-white block">{analyticsData?.overall?.cancelled || 0}</span>
                  <span className="text-xs text-amber-600 font-medium bg-amber-50 dark:bg-amber-900/10 px-2 py-1 rounded-full">Overall Cancelled</span>
                </div>

                {/* Gender Breakdown */}
                <div className="grid grid-cols-2 gap-4 border-t border-gray-100 dark:border-gray-800 pt-4">
                  {/* Male */}
                  <div className="text-center">
                    <div className="mb-1 text-gray-400 text-xs uppercase tracking-wider">Male</div>
                    <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                      {analyticsData?.genderWise?.find(g => g.gender === 'Male')?.cancelled || 0}
                    </span>
                  </div>
                  {/* Female */}
                  <div className="text-center border-l border-gray-100 dark:border-gray-800">
                    <div className="mb-1 text-gray-400 text-xs uppercase tracking-wider">Female</div>
                    <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                      {analyticsData?.genderWise?.find(g => g.gender === 'Female')?.cancelled || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Row 3: Patient Locations Map (Full Width Large Section) */}
          {/* Row 3: Patient Locations Section (Split: Top 5 List + Full Map) */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

            {/* Left Col: City Distribution List */}
            <Card className="xl:col-span-1 shadow-sm border-gray-200 dark:border-gray-800 flex flex-col">
              <CardHeader className="pb-2 bg-gray-50/50 dark:bg-gray-800/10 shrink-0">
                <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                  City Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pb-2">
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {analyticsData ? (
                    (() => {
                      const cityEntries = Object.entries(analyticsData?.overall?.top5City || {})
                        .sort(([, a], [, b]) => b - a);

                      // Calculate max for progress bar
                      const maxCount = Math.max(...cityEntries.map(([, c]) => c)) || 1;

                      return cityEntries.map(([city, count], index) => (
                        <div key={city} className="relative p-3 rounded-lg bg-white/50 dark:bg-gray-800/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-colors border border-gray-100 dark:border-gray-800 group">
                          {/* Progress bar background */}
                          <div className="absolute bottom-0 left-0 h-1 bg-indigo-100 dark:bg-gray-700 w-full rounded-b-lg overflow-hidden opacity-50">
                            <div className="h-full bg-indigo-500 rounded-lg" style={{ width: `${(count / maxCount) * 100}%` }}></div>
                          </div>

                          <div className="flex items-center justify-between relative z-10 mb-1">
                            <div className="flex items-center gap-3">
                              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shadow-sm ${index === 0 ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-50' :
                                index === 1 ? 'bg-gray-200 text-gray-600' :
                                  index === 2 ? 'bg-orange-100 text-orange-700' :
                                    'bg-indigo-50 text-indigo-600'
                                }`}>
                                {index + 1}
                              </div>
                              <span className="font-semibold text-gray-700 dark:text-gray-200 capitalize">{city}</span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                {count.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-gray-400 uppercase tracking-wide">Patients</span>
                            </div>
                          </div>
                        </div>
                      ));
                    })()
                  ) : (
                    <div className="text-center py-8 text-gray-400">Loading cities...</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Right Col: Full Map */}
            <Card className="xl:col-span-2 shadow-sm border-gray-200 dark:border-gray-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2 bg-gray-50/50 dark:bg-gray-800/10">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <MapIcon className="h-5 w-5 text-teal-600" />
                    Patient Distribution Map
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Geographical spread of all unique patient locations</p>
                </div>
              </CardHeader>
              <CardContent className="p-0 h-[400px] w-full relative">
                {analyticsData ? (
                  <CityMap
                    data={analyticsData?.overall?.top5City || {}}
                    cities={analyticsData?.overall?.uniqueCities || []}
                    className="rounded-none border-x-0 border-b-0"
                  />
                ) : (
                  <div className="h-full w-full bg-gray-50 flex items-center justify-center text-gray-400">Loading map...</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
            {/* Doctor Performance Analytics Table (Span 3) */}
            <Card className="xl:col-span-3 shadow-sm border-gray-200 dark:border-gray-800 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-4 bg-gray-50/50 dark:bg-gray-800/10">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    <Stethoscope className="h-5 w-5 text-blue-600" />
                    Doctor Performance Analytics
                  </CardTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Detailed breakdown of patient visits and trends per doctor</p>
                </div>
                <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2 text-xs h-8">
                  <Download className="h-3.5 w-3.5" /> Export Report
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100/70 dark:bg-gray-800/70 text-xs uppercase text-gray-500 font-semibold border-b border-gray-200 dark:border-gray-800">
                      <tr>
                        <th className="px-6 py-4 min-w-[200px] whitespace-nowrap">Doctor</th>
                        <th className="px-6 py-4 text-center whitespace-nowrap">Total Visits</th>
                        <th className="px-6 py-4 text-center whitespace-nowrap">Unique Pts</th>
                        <th className="px-6 py-4 text-center whitespace-nowrap">New Patients <span className="text-[10px] lowercase font-normal opacity-70 block">(D / W / M / Y)</span></th>
                        <th className="px-6 py-4 text-center whitespace-nowrap">Returning</th>
                        <th className="px-6 py-4 text-center whitespace-nowrap">No Show</th>
                        <th className="px-6 py-4 text-right whitespace-nowrap">Share %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                      {analyticsData?.breakdowns?.byDoctor?.length ? analyticsData.breakdowns.byDoctor.map((doc, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-amber-100 text-amber-700' :
                                idx === 1 ? 'bg-gray-200 text-gray-600' :
                                  idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-600'
                                }`}>
                                {doc.doctorName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">{doc.doctorName}</div>
                                <div className="text-xs text-gray-500">{doc.specialty}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                            {doc.overallVisits.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-center text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {doc.uniquePatients.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 max-w-[220px] whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2 text-xs">
                              <div className="flex flex-col items-center bg-blue-50 dark:bg-blue-900/10 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-900/20">
                                <span className="font-bold text-blue-700 dark:text-blue-300">{doc.newPatients.day}</span>
                                <span className="text-[8px] text-blue-400 uppercase">Day</span>
                              </div>
                              <div className="h-4 w-px bg-gray-200"></div>
                              <div className="flex flex-col items-center">
                                <span className="font-medium text-gray-700 dark:text-gray-300">{doc.newPatients.week}</span>
                                <span className="text-[8px] text-gray-400 uppercase">Wk</span>
                              </div>
                              <div className="h-4 w-px bg-gray-200"></div>
                              <div className="flex flex-col items-center">
                                <span className="font-medium text-gray-700 dark:text-gray-300">{doc.newPatients.month}</span>
                                <span className="text-[8px] text-gray-400 uppercase">Mo</span>
                              </div>
                              <div className="h-4 w-px bg-gray-200"></div>
                              <div className="flex flex-col items-center">
                                <span className="font-medium text-gray-700 dark:text-gray-300">{doc.newPatients.year}</span>
                                <span className="text-[8px] text-gray-400 uppercase">Yr</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center">
                              <span className="font-medium text-indigo-600 dark:text-indigo-400">{doc.returningPatients.toLocaleString()}</span>
                              <span className="text-[10px] text-gray-400">{(doc.returningPatients / doc.overallVisits * 100).toFixed(0)}% rate</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${doc.noShow > 100 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                              }`}>
                              {doc.noShow}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{doc.sharePercent}%</span>
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600" style={{ width: `${doc.sharePercent}%` }}></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Loading doctor data...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <div className="bg-gray-50 dark:bg-gray-800/30 px-6 py-3 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs text-gray-500">
                <span>Showing top 5 doctors by volume</span>
                <span className="hover:text-blue-600 cursor-pointer transition-colors">View All Doctors &rarr;</span>
              </div>
            </Card>

            {/* Specialty Performance Card (Span 1) - Moved here */}
            <Card className="xl:col-span-1 shadow-sm border-gray-200 dark:border-gray-800 flex flex-col h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-purple-600" />
                  Specialty Performance
                </CardTitle>
                <p className="text-xs text-gray-500">Patient distribution by department</p>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 overflow-y-auto max-h-[500px] pr-1">
                {analyticsData?.breakdowns?.bySpecialty?.length ? (
                  analyticsData.breakdowns.bySpecialty.map((spec, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{spec.specialtyName}</span>
                          <div className="flex items-center gap-1">
                            {spec.trendVsPreviousPeriod && Math.abs(spec.trendVsPreviousPeriod.percent) > 0 && (
                              <span className={`text-[10px] font-bold ${spec.trendVsPreviousPeriod.direction === 'UP' ? 'text-green-600' :
                                spec.trendVsPreviousPeriod.direction === 'DOWN' ? 'text-red-500' : 'text-gray-400'
                                }`}>
                                {spec.trendVsPreviousPeriod.direction === 'UP' ? '↑' :
                                  spec.trendVsPreviousPeriod.direction === 'DOWN' ? '↓' : ''}
                                {Math.abs(spec.trendVsPreviousPeriod.percent)}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {spec.uniquePatients.toLocaleString()} Unique Patients</span>
                          <span className="text-gray-300 dark:text-gray-700">•</span>
                          <span>{spec.overallVisits.toLocaleString()} Overall Visits</span>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${idx === 0 ? 'bg-purple-500' :
                              idx === 1 ? 'bg-blue-500' :
                                idx === 2 ? 'bg-indigo-500' :
                                  idx === 3 ? 'bg-pink-500' : 'bg-gray-400'
                              }`} style={{ width: `${spec.sharePercent}%` }}></div>
                          </div>
                          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 w-8 text-right">{spec.sharePercent}%</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    {analyticsData ? 'No specialty data available' : 'Loading specialties...'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )
      }

      {/* User Management Module */}
      {currentView === 'user-management' && <UserManagementModule />}

      {/* Patient Management Module */}
      {currentView === 'patient-management' && <PatientManagementModule />}

      {/* Billing Management Module - Upcoming */}
      {
        currentView === 'billing-management' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-in fade-in zoom-in duration-500">
            <div className="relative mb-6 group">
              <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500"></div>
              <div className="relative h-24 w-24 bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-slate-900 rounded-full flex items-center justify-center shadow-lg border border-blue-100 dark:border-blue-900/50">
                <IndianRupee className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                SOON
              </div>
            </div>

            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Billing System</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto text-lg leading-relaxed mb-8">
              We're building a comprehensive billing suite with <span className="font-medium text-slate-700 dark:text-slate-200">insurance integration</span>, <span className="font-medium text-slate-700 dark:text-slate-200">automated invoicing</span>, and <span className="font-medium text-slate-700 dark:text-slate-200">revenue analytics</span>.
            </p>

            <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400">
              <Clock className="h-4 w-4" />
              <span>Expected launch in upcoming release</span>
            </div>
          </div>
        )
      }



      {/* System Configuration Module */}
      {
        (currentView === 'system-config' || currentView === 'system-config-hospital') && (
          <div data-module={currentView === 'system-config-hospital' ? 'system-config-hospital' : 'system-config'}>
            <SystemConfigModule focusTab={currentView === 'system-config-hospital' ? 'hospital' : undefined} />
          </div>
        )
      }
    </div >
  );
};
