import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useUserDetails } from '@/hooks/useUserProfileApi';
import { useLanguage } from '@/hooks/useLanguage';
import { useTranslation } from 'react-i18next';
import { useLogout } from '@/hooks/useLogout';
import { useSubscriptionApi } from '@/features/subscription/hooks/useSubscriptionApi';
import { SubscriptionExpiredScreen } from '@/features/subscription/components/SubscriptionExpiredScreen';
import { SubscriptionExpiryBanner } from '@/features/subscription/components/SubscriptionExpiryBanner';
import {
  Calendar,
  Users,
  Clock,
  UserX,
  TrendingUp,
  Bell,
  User,
  Globe,
  Menu,
  X,
  Settings,
  LogOut,
  Stethoscope,
  Home,
  UserCheck,
  Building2,
  ChevronDown,
  Check,
  CreditCard,
  Bot,
  MessageCircle,
  Send,
  Zap,
  Phone,
  DollarSign,
  Activity,
  UserPlus,
  Heart,
  FlaskConical,
  CheckCircle,
  List,
  CalendarDays,
  Eye,
  Filter,
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  History as HistoryIcon,
  LayoutDashboard,
  Receipt,
  Shield,
  IndianRupee,
  Hotel,
  FileCheck,
  Boxes,
  BookLock,
  Droplet,
  FolderSearch,
  Activity as ActivityIcon,
  Siren,
  Wrench,
  Ambulance,
  UserSquare,
  Crown,
  Droplets,
  ShieldAlert,
  ListChecks,
  ShieldOff,
  MessageSquareText,
  FileCheck2,
  AlertTriangle,
  FileBadge2,
  CheckSquare,
  XSquare,
  HeartPulse
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { HospitalSwitcher } from './HospitalSwitcher';
import { HeaderLanguageSelector } from '@/components/shared/HeaderLanguageSelector';
import { AlertBell } from '@/features/alerts/components/AlertBell';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// --- Animated Gamified Clock Component ---
const GamifiedClock = ({ currentTime }: { currentTime: Date }) => {
  const hours = currentTime.getHours().toString().padStart(2, '0');
  const minutes = currentTime.getMinutes().toString().padStart(2, '0');
  const seconds = currentTime.getSeconds().toString().padStart(2, '0');

  const flipVariants = {
    initial: { y: -15, opacity: 0, scale: 0.9 },
    animate: { y: 0, opacity: 1, scale: 1 },
    exit: { y: 15, opacity: 0, scale: 0.9, position: 'absolute' }
  };

  const DigitRender = ({ val, id }: { val: string, id: string }) => (
    <div className="relative overflow-hidden bg-white/20 dark:bg-black/40 rounded-md min-w-[28px] h-[32px] flex items-center justify-center font-mono font-bold shadow-inner border border-white/10 dark:border-gray-700/50 backdrop-blur-sm">
      <AnimatePresence initial={false}>
        <motion.span
          key={`${id}-${val}`}
          variants={flipVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="absolute"
        >
          {val}
        </motion.span>
      </AnimatePresence>
    </div>
  );

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="hidden lg:flex items-center gap-3 pl-1.5 pr-4 py-1.5 bg-gradient-to-r from-brand-50/80 to-brand-50/80 dark:from-brand-900/20 dark:to-brand-900/20 backdrop-blur-md border border-brand-200/50 dark:border-brand-800/50 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group cursor-default relative overflow-hidden"
    >
      {/* Background sweep effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 dark:via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

      {/* Clock Icon container with pulse */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="p-2 bg-gradient-to-br from-brand-500 to-purple-600 rounded-xl shadow-lg shadow-brand-500/30 text-white relative"
      >
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 bg-white/20 rounded-xl"
        />
        <Clock className="h-4 w-4 relative z-10" />
      </motion.div>

      <div className="flex flex-col items-start pt-0.5">
        <span className="text-[10px] font-bold text-brand-600/80 dark:text-brand-400/80 uppercase tracking-widest leading-none mb-1">
          {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>

        {/* Gamified Time Display */}
        <div className="flex items-center gap-1 text-base lg:text-lg text-gray-800 dark:text-gray-100 leading-none tracking-tight">
          <DigitRender val={hours} id="h" />
          <span className="text-brand-400 dark:text-brand-500 animate-pulse font-bold">:</span>
          <DigitRender val={minutes} id="m" />
          <span className="text-brand-400 dark:text-brand-500 font-bold">:</span>
          <DigitRender val={seconds} id="s" />
        </div>
      </div>
    </motion.div>
  );
};
// ----------------------------------------

interface MainLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  path: string;
  subItems?: NavigationItem[];
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const hospitalAccessRestricted = useAuthStore(state => state.hospitalAccessRestricted);
  const hospitalAccessMessage = useAuthStore(state => state.hospitalAccessMessage);
  const hospitalId = useAuthStore(state => state.hospitalId) || '';
  const roles = useAuthStore(state => state.userRoles) || [];
  const isAdminRole = roles.includes('Admin') || roles.includes('AdminDoctor');
  const { getStatus } = useSubscriptionApi();
  const { data: subscriptionStatus } = getStatus(hospitalId);
  const isSubscriptionExpired = subscriptionStatus?.status === 'Expired' || subscriptionStatus?.status === 'Blocked';
  // Same 3-day runway regardless of billing cycle (Monthly/Quarterly/Half-Yearly/Yearly) — it's
  // purely a function of how close SubscriptionEndDate is, not which cycle the plan is on.
  const showExpiryWarning = isAdminRole
    && subscriptionStatus?.status === 'Active'
    && subscriptionStatus?.daysLeft != null
    && subscriptionStatus.daysLeft <= 3
    && !!subscriptionStatus?.subscriptionEndDate;
  // Sidebar is a fixed icon-rail (collapsed only) — no expand/collapse toggle.
  const sidebarCollapsed = true;
  const triggerLogout = useLogout();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { currentLanguage, isRTL } = useLanguage();
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Profile completion hook
  const { completionPercentage, doctorProfileCompletion } = useProfileCompletion();

  const profileScore = completionPercentage;
  const authStore = useAuthStore.getState();
  const userRoles = authStore.getUserRoles() || ['Doctor'];
  const userId = authStore.getUserId();
  const isDoc = userRoles.includes('Doctor') || userRoles.includes('AdminDoctor');
  const profileTarget = isDoc ? '/profile?tab=professional' : '/profile';
  const personalProfileLabel = t('header.personalProfile');



  // Fetch user details for profile dropdown
  const { data: userDetailsResponse } = useUserDetails(userId || '');

  // Get user name or fallback to contact number
  const getUserDisplayName = () => {
    if (userDetailsResponse?.userProfile?.fullName) {
      return userDetailsResponse.userProfile.fullName;
    }
    return userDetailsResponse?.mobileNumber || 'User';
  };

  // Navigation items with role-based filtering
  const allNavigationItems: NavigationItem[] = [
    { id: 'admin', name: t('header.adminPanel'), icon: Shield, path: '/admin' },
    { id: 'configuration', name: t('header.configuration') || 'Configuration', icon: Settings, path: '/configuration' },
    { id: 'subscription', name: 'Subscription', icon: Crown, path: '/subscription' },
    { id: 'dashboard', name: t('header.clinicalDashboard'), icon: LayoutDashboard, path: '/dashboard' },
    {
      id: 'appointments',
      name: t('header.appointmentScheduler'),
      icon: Calendar,
      path: '/appointment-dashboard',
    },
    { id: 'billing', name: t('header.billing') || 'Billing', icon: IndianRupee, path: '/billing' },
    { id: 'ipd-redesign', name: 'IPD', icon: Hotel, path: '/ipd-workspace' },
    { id: 'inventory', name: 'Inventory', icon: Boxes, path: '/inventory' },
    { id: 'ot-board', name: 'OT Board', icon: ActivityIcon, path: '/ot-board' },
    { id: 'icu-board', name: 'ICU Board', icon: HeartPulse, path: '/icu-board' },
  ];

  // Filter navigation items based on user role
  const navigation: NavigationItem[] = allNavigationItems.filter(item => {
    if (item.id === 'admin' || item.id === 'configuration' || item.id === 'subscription') {
      return userRoles.includes('Admin') || userRoles.includes('AdminDoctor');
    }
    if (item.id === 'dashboard' || item.id === 'doc-ai' || item.id === 'calendar') {
      return userRoles.includes('Doctor') || userRoles.includes('AdminDoctor');
    }
    if (item.id === 'appointments') {
      return userRoles.includes('Admin') || userRoles.includes('AdminDoctor') || userRoles.includes('Receptionist') || userRoles.includes('Nurse');
    }
    if (item.id === 'billing') {
      return userRoles.includes('Admin') || userRoles.includes('AdminDoctor') || userRoles.includes('Doctor') || userRoles.includes('Accountant');
    }
    if (item.id === 'ipd-redesign' || item.id === 'inventory' || item.id === 'ot-board' || item.id === 'icu-board') {
      return userRoles.includes('Admin') || userRoles.includes('AdminDoctor') || userRoles.includes('Doctor') || userRoles.includes('Nurse');
    }
    return true;
  });

  // Get current page from location
  useEffect(() => {
    const currentPath = location.pathname;
    const navItem = navigation.find(item => item.path === currentPath);
    if (navItem) {
      setCurrentPage(navItem.id);
    }
  }, [location.pathname]);

  // Once the trial/subscription has expired, an admin can only reach the Subscription page —
  // force them there on load and on any direct navigation (not just sidebar clicks).
  useEffect(() => {
    if (isSubscriptionExpired && isAdminRole && location.pathname !== '/subscription') {
      navigate('/subscription', { replace: true });
    }
  }, [isSubscriptionExpired, isAdminRole, location.pathname, navigate]);

  const handleNavigation = (item: NavigationItem) => {
    if (isSubscriptionExpired && isAdminRole && item.id !== 'subscription') {
      setCurrentPage('subscription');
      setSidebarOpen(false);
      navigate('/subscription');
      return;
    }
    if (hospitalAccessRestricted && item.id !== 'admin') {
      setCurrentPage('admin');
      setSidebarOpen(false);
      navigate('/admin');
      return;
    }
    setCurrentPage(item.id);
    setSidebarOpen(false);
    navigate(item.path);
  };

  const handleLogout = async () => {
    try {
      await triggerLogout({ redirectTo: '/login' });
    } catch (error) {
      console.error('Failed to logout cleanly', error);
    }
  };

  // Non-admin roles have no subscription page to fall back to — once expired, they're fully
  // locked out of the platform and told to go through their administrator.
  if (isSubscriptionExpired && !isAdminRole) {
    return <SubscriptionExpiredScreen onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-all duration-300 overflow-x-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 z-50 h-full w-24
        bg-gradient-to-b from-[#4f46e5] to-[#3f37c9] dark:from-gray-800 dark:to-gray-900
        border-r border-white/10 dark:border-gray-700 shadow-xl shadow-black/20
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        transform transition-transform duration-300 ease-in-out
      `}>
        <div className="relative h-full w-full overflow-hidden flex flex-col">
          {/* Brand */}
          <div className="flex items-center justify-center shrink-0 h-16 border-b border-white/10">
            <img src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" alt="Company Logo" className="h-10 w-10 object-contain" />
          </div>

          {/* Navigation — fixed icon rail */}
          <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {navigation.map((item) => {
              const isActive = currentPage === item.id || currentPage.startsWith(item.id + '-');
              const isDisabled = (isSubscriptionExpired && isAdminRole && item.id !== 'subscription')
                || (hospitalAccessRestricted && item.id !== 'admin');
              return (
                <div key={item.id} className="relative group">
                  {/* Active accent on the rail edge */}
                  {isActive && <span className="absolute -left-2 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.5)]" />}
                  <button
                    type="button"
                    onClick={() => handleNavigation(item)}
                    disabled={isDisabled}
                    title={item.name}
                    className={cn(
                      'w-full flex flex-col items-center justify-center gap-1.5 h-16 rounded-2xl px-1 transition-all duration-200',
                      isActive
                        ? 'bg-white/15 text-white ring-1 ring-inset ring-white/25 shadow-lg shadow-black/10'
                        : 'text-white/65 hover:bg-white/10 hover:text-white',
                      isDisabled && 'opacity-50 cursor-not-allowed hover:bg-transparent hover:text-white/65',
                    )}
                  >
                    <item.icon className={cn('h-[18px] w-[18px] shrink-0 transition-transform duration-200', !isDisabled && 'group-hover:scale-110')} />
                    <span className="text-[10px] font-semibold leading-tight text-center line-clamp-2 w-full px-0.5">{item.name}</span>
                  </button>

                  {/* Hover tooltip with the full name */}
                  <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap shadow-xl">
                    {item.name}
                  </div>
                </div>
              );
            })}
          </nav>



          {/* Bottom Section - Logout (compact, red) */}
          <div className="flex-none px-2.5 py-2.5 border-t border-white/10">
            <button
              type="button"
              onClick={handleLogout}
              title={t('common.logout')}
              className="group w-full flex items-center justify-center gap-1.5 h-9 rounded-lg px-1 bg-red-500/15 text-red-200 ring-1 ring-inset ring-red-400/30 hover:bg-red-500 hover:text-white hover:ring-red-500 transition-all duration-200"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="text-[11px] font-semibold">{t('common.logout')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${sidebarCollapsed ? 'lg:ml-24' : 'lg:ml-64'} flex flex-col h-screen overflow-x-hidden relative z-0`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
              >
                <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </Button>

              {/* Brand moved to the sidebar; the hospital control anchors the top nav. */}
              <HospitalSwitcher />

              {/* Page Title and Welcome */}
              <div className="hidden lg:block border-l border-gray-200 dark:border-gray-700 pl-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white capitalize tracking-tight">
                  {currentPage === 'dashboard' ? t('header.clinicalDashboard') : navigation.find(n => n.id === currentPage)?.name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 font-medium">
                  {t('header.welcomeBack')}, {getUserDisplayName()}
                </p>
              </div>
            </div>

            {/* Center Section - Date/Time Display */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
              <GamifiedClock currentTime={currentTime} />
            </div>

            <div className="flex items-center gap-4">
              {/* Profile Completion Indicator */}
              {profileScore < 100 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(profileTarget)}
                  className="hidden md:flex items-center gap-2 border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:border-amber-300 dark:hover:border-amber-600"
                >
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">{personalProfileLabel} ({profileScore}%)</span>
                </Button>
              )}

              {/* Alerts */}
              <AlertBell />

              {/* Theme Toggle */}
              <ThemeToggle
                variant="ghost"
                size="sm"
                className="p-2 hover:bg-muted/50 rounded-lg"
              />

              {/* Enhanced Language Selector */}
              <HeaderLanguageSelector />

              {/* User Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 hover:bg-muted/50">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src="/avatars/01.png" alt="User" />
                      <AvatarFallback className="bg-brand-600 text-white text-sm font-medium">
                        {getUserDisplayName().charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-lg" align="end" forceMount>
                  <DropdownMenuItem className="font-normal text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-gray-900 dark:text-white">
                        {getUserDisplayName()}
                      </p>
                      <p className="text-xs leading-none text-gray-600 dark:text-gray-300">
                        {userRoles.join(', ')}
                      </p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-200 dark:bg-gray-600" />
                  <DropdownMenuItem onClick={() => navigate(profileTarget)} className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700">
                    <User className="mr-2 h-4 w-4 text-gray-600 dark:text-gray-300" />
                    <span>{t('header.profile')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {showExpiryWarning && <SubscriptionExpiryBanner endDate={subscriptionStatus!.subscriptionEndDate!} />}

        {/* Page Content */}
        <main className={cn(
          "flex-1 overflow-x-hidden overflow-y-auto transition-all duration-300 bg-gray-50 dark:bg-gray-950",
          (location.pathname.startsWith('/admin') || location.pathname.startsWith('/dashboard')) ? "p-0" : "p-6"
        )}>
          {children}
        </main>
      </div>

    </div>
  );
}; 