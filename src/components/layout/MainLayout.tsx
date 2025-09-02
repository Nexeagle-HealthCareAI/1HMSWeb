import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useAppStore, useUserStore, useNotificationStore, useThemeStore } from '@/store';
import { useQueryClient } from '@tanstack/react-query';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useUserDetails } from '@/hooks/useUserProfileApi';
import { useLanguage } from '@/hooks/useLanguage';
import { useTranslation } from 'react-i18next';
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
  ChevronRight
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
import { EyeFriendlyNotification } from '@/components/ui/eye-friendly-notification';
import { HeaderLanguageSelector } from '@/components/shared/HeaderLanguageSelector';

interface MainLayoutProps {
  children: React.ReactNode;
}

interface NavigationItem {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  path: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuthStore();
  const { resetAppState } = useAppStore();
  const { resetUserState } = useUserStore();
  const { clearNotifications } = useNotificationStore();
  const { resetColors } = useThemeStore();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { currentLanguage, isRTL } = useLanguage();
  const { t } = useTranslation();

  // Profile completion hook
  const { completionPercentage, doctorProfileCompletion } = useProfileCompletion();
  
  const profileScore = completionPercentage;
  const authStore = useAuthStore.getState();
  const userRole = authStore.getUserRole() || 'Doctor';
  const userId = authStore.getUserId();
  const profileTarget = (userRole === 'Doctor' || userRole === 'AdminDoctor') ? '/profile?tab=professional' : '/profile';

  // Keyboard shortcut for sidebar toggle
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        console.log('Keyboard shortcut triggered, current state:', sidebarCollapsed);
        setSidebarCollapsed(!sidebarCollapsed);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarCollapsed]);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setSidebarCollapsed(JSON.parse(savedState));
    }
  }, []);

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
    { id: 'admin', name: t('header.adminPanel'), icon: Settings, path: '/admin' },
    { id: 'dashboard', name: t('header.clinicalDashboard'), icon: Activity, path: '/dashboard' },    
    { id: 'calendar', name: t('header.doctorCalendar'), icon: CalendarDays, path: '/calendar' },
    { id: 'appointments', name: t('header.appointmentScheduler'), icon: Calendar, path: '/appointment-dashboard' },
    { id: 'doc-ai', name: t('header.docAI'), icon: Bot, path: '/doc-ai' },
  ];

  // Filter navigation items based on user role
  const navigation: NavigationItem[] = allNavigationItems.filter(item => {
    if (item.id === 'admin') {
      return userRole === 'Admin' || userRole === 'AdminDoctor';
    }
    if (item.id === 'dashboard' || item.id === 'doc-ai' || item.id === 'calendar') {
      return userRole === 'Doctor' || userRole === 'AdminDoctor';
    }
    if (item.id === 'appointments') {
      return userRole === 'Admin' || userRole === 'AdminDoctor' || userRole === 'Receptionist' || userRole === 'Nurse';
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

  const handleNavigation = (item: NavigationItem) => {
    setCurrentPage(item.id);
    setSidebarOpen(false);
    navigate(item.path);
  };

  const handleLogout = () => {
    // Clear React Query cache
    queryClient.clear();
    
    // Clear all localStorage items
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear any account lockout data
    localStorage.removeItem('accountLockout');
    
    // Clear any rate limiting data
    Object.keys(localStorage).forEach(key => {
      if (key.includes('rate_limit') || key.includes('otp_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Clear all stores
    logout();
    resetAppState();
    resetUserState();
    clearNotifications();
    resetColors();
    
    // Navigate to home page
    navigate('/');
  };

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
        fixed top-0 left-0 z-50 h-full bg-white/95 dark:bg-gray-900/95 border-r border-gray-200/50 dark:border-gray-700/50 transform transition-all duration-500 ease-in-out shadow-xl
        ${sidebarCollapsed ? 'w-20' : 'w-64'} 
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        hover:shadow-2xl
        group/sidebar
        backdrop-blur-md
        before:absolute before:inset-0 before:bg-gradient-to-b before:from-transparent before:via-white/5 before:to-transparent before:pointer-events-none
        after:absolute after:inset-0 after:bg-gradient-to-r after:from-blue-500/5 after:via-transparent after:to-transparent after:pointer-events-none
        animate-in slide-in-from-left-2 duration-500
        overflow-hidden
      `}>
        <div className="relative h-full w-full overflow-hidden">
        {/* Sidebar Toggle Button - Right Side (Only visible when expanded) */}
        {!sidebarCollapsed && (
          <div className="absolute top-4 right-3 z-20 group">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                console.log('Sidebar toggle button clicked, current state:', sidebarCollapsed);
                setSidebarCollapsed(!sidebarCollapsed);
              }}
              className="relative h-10 w-10 p-0 hover:bg-white/90 dark:hover:bg-gray-800/90 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg border border-gray-200/50 dark:border-gray-600/50 hover:border-blue-300 dark:hover:border-blue-600 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-md active:scale-95 active:rotate-3 overflow-hidden"
              title="Collapse sidebar"
            >
              {/* Ripple effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Icon with enhanced animations */}
              <div className="relative z-10">
                <X className="h-5 w-5 text-gray-600 dark:text-gray-300 transition-all duration-300 transform group-hover:rotate-90 group-active:rotate-180" />
              </div>
              
              {/* Click pulse effect */}
              <div className="absolute inset-0 bg-blue-400/30 rounded-xl scale-0 group-active:scale-100 transition-transform duration-200 ease-out"></div>
            </Button>
          </div>
        )}

        {/* Navigation */}
        <nav className={`${sidebarCollapsed ? 'p-3' : 'p-4'} space-y-3 mt-3 transition-all duration-300 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500`}>

          
          {navigation.map((item, index) => {
            const isActive = currentPage === item.id;
            return (
              <div key={item.id} className="relative group overflow-hidden" style={{ animationDelay: `${index * 50}ms` }}>
                <Button
                  variant="ghost"
                  className={`
                    w-full relative transition-all duration-500 flex items-center animate-in slide-in-from-left-2
                    ${sidebarCollapsed ? 'justify-center px-3 h-14 w-14 mx-auto rounded-2xl' : 'justify-start gap-4 h-14 px-5 rounded-2xl'}
                    ${isActive 
                      ? 'bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-blue-50/40 text-blue-600 dark:text-blue-400 border-2 border-blue-200/50 dark:border-blue-700/50 shadow-xl scale-105 ring-2 ring-blue-200/30 dark:ring-blue-700/30 backdrop-blur-sm' 
                      : 'text-muted-foreground hover:bg-gradient-to-r hover:from-blue-50/60 hover:via-indigo-50/40 hover:to-blue-50/30 dark:hover:from-blue-900/20 dark:hover:via-indigo-900/15 dark:hover:to-blue-900/10 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-105'
                    }
                    hover:shadow-xl active:scale-95
                  `}
                  onClick={() => handleNavigation(item)}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  {/* Active indicator line */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1.5 h-10 bg-gradient-to-b from-blue-500 to-blue-400/80 rounded-r-full shadow-lg"></div>
                  )}
                  
                  {/* Icon container with enhanced effects */}
                  <div className={`
                    relative flex items-center justify-center rounded-xl p-3 transition-all duration-300
                    ${isActive 
                      ? 'bg-gradient-to-br from-blue-100/80 to-indigo-100/60 text-blue-600 dark:text-blue-400 shadow-lg' 
                      : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 text-gray-600 dark:text-gray-400 group-hover:bg-gradient-to-br group-hover:from-blue-100/60 group-hover:to-indigo-100/40 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:shadow-lg'
                    }
                  `}>
                    <item.icon className={`${sidebarCollapsed ? 'h-5 w-5' : 'h-6 w-6'} transition-all duration-300 group-hover:scale-110`} />
                    
                    {/* Icon glow effect */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-xl blur-lg animate-pulse"></div>
                    )}
                  </div>
                  
                  {!sidebarCollapsed && (
                    <div className="flex flex-col items-start flex-1">
                      <span className={`font-semibold text-sm transition-all duration-300 ${
                        isActive ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground group-hover:text-foreground'
                      }`}>
                        {item.name}
                      </span>
                      {isActive && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                          <span className="text-xs font-medium text-blue-600/80 dark:text-blue-400/80 bg-blue-100/60 dark:bg-blue-900/30 px-2 py-1 rounded-full">Active</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Button>
                
                {/* Enhanced hover tooltip for collapsed state */}
                {sidebarCollapsed && (
                  <div className="absolute left-full top-1/2 transform -translate-y-1/2 ml-2 px-2 py-1 bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-100 dark:to-gray-200 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 whitespace-nowrap shadow-lg border border-gray-700/50 dark:border-gray-300/50 backdrop-blur-sm max-w-28 overflow-hidden">
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <span className="font-semibold truncate">{item.name}</span>
                    </div>
                    {/* Tooltip arrow */}
                    <div className="absolute left-0 top-1/2 transform -translate-x-full -translate-y-1/2 w-0 h-0 border-l-3 border-l-transparent border-r-3 border-r-gray-900 dark:border-r-gray-200 border-t-3 border-t-transparent border-b-3 border-b-transparent"></div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>



        {/* Floating Expand Button for Collapsed State */}
        {sidebarCollapsed && (
          <div className="absolute -right-3 top-1/2 transform -translate-y-1/2 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                console.log('Floating expand button clicked');
                setSidebarCollapsed(false);
              }}
              className="h-8 w-8 p-0 hover:bg-blue-500 hover:text-white rounded-full transition-all duration-300 hover:scale-110 shadow-lg border-2 border-blue-500 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400"
              title="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Bottom Section - Profile & Logout */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100/50 dark:border-gray-700/50 bg-gradient-to-t from-gray-50/80 via-gray-50/40 to-transparent dark:from-gray-800/80 dark:via-gray-800/40 backdrop-blur-sm overflow-hidden`}>
          {/* Profile Section */}
          {!sidebarCollapsed && (
            <div className="mb-4 p-4 bg-gradient-to-r from-white/90 to-gray-50/90 dark:from-gray-800/90 dark:to-gray-700/90 rounded-2xl border border-gray-200/50 dark:border-gray-600/50 shadow-lg backdrop-blur-sm hover:shadow-xl transition-all duration-300 group-hover:scale-105">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20 shadow-lg">
                    <AvatarImage src="/avatars/01.png" alt="User" />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-sm font-bold">
                      {getUserDisplayName().charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Online indicator */}
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full animate-pulse"></div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {getUserDisplayName()}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                      {userRole}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Logout Button */}
          <Button
            variant="ghost"
            className={`
              w-full group transition-all duration-500
              ${sidebarCollapsed ? 'justify-center px-3 h-14 w-14 mx-auto rounded-2xl' : 'justify-start gap-4 h-14 px-5 rounded-2xl'}
              text-muted-foreground hover:text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 dark:hover:from-red-900/20 dark:hover:to-red-800/20 border-2 border-gray-200/50 dark:border-gray-600/50 hover:border-red-300 dark:hover:border-red-600
              hover:shadow-xl active:scale-95
            `}
            onClick={handleLogout}
            title={sidebarCollapsed ? "Logout" : undefined}
          >
            <div className={`
              relative flex items-center justify-center rounded-xl p-3 transition-all duration-300
              bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 text-red-600 dark:text-red-400 
              group-hover:bg-gradient-to-br group-hover:from-red-100 group-hover:to-red-200 dark:group-hover:from-red-800/30 dark:group-hover:from-red-700/30
              group-hover:shadow-lg group-hover:scale-110
            `}>
              <LogOut className={`${sidebarCollapsed ? 'h-6 w-6' : 'h-5 w-5'} transition-all duration-300`} />
              
              {/* Button glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-400/20 to-transparent rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            
            {!sidebarCollapsed && (
              <div className="flex flex-col items-start">
                <span className="font-semibold text-sm">Logout</span>
                <span className="text-xs text-red-500/70">Sign out safely</span>
              </div>
            )}
          </Button>
        </div>
        </div>
      </div>

      {/* Main Content */}
         <div className={`${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'} flex flex-col h-screen transition-all duration-500 ease-in-out overflow-x-hidden`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0 shadow-sm transition-all duration-200">
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

              {/* Logo and Branding */}
              <div className="flex items-center gap-3">
                <img src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" alt="Company Logo" className="h-8 w-8 transition-all duration-200" />
                <div className="hidden md:block">
                  <h1 className="font-black text-gray-900 dark:text-white text-xl transition-all duration-300 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">NexEagle</h1>
                  <p className="text-sm font-bold text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text transition-all duration-300">easyHMS</p>
                </div>
              </div>

              {/* Page Title and Welcome */}
              <div className="hidden lg:block border-l border-gray-200 dark:border-gray-700 pl-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white capitalize transition-colors duration-200">
                  {currentPage === 'dashboard' ? t('header.clinicalDashboard') : navigation.find(n => n.id === currentPage)?.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 transition-colors duration-200">
                  {t('header.welcomeBack')}, {getUserDisplayName()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Sidebar Toggle Hint */}
              <div className="hidden lg:flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                <span>Ctrl+B</span>
                <span>to toggle sidebar</span>
              </div>
              
              {/* Profile Completion Indicator */}
              {profileScore < 100 && (
                              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(profileTarget)}
                className="hidden md:flex items-center gap-2 border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 hover:border-amber-300 dark:hover:border-amber-600 transition-all duration-200"
              >
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">{t('header.completeProfile')} ({profileScore}%)</span>
                </Button>
              )}

              {/* Theme Toggle */}
              <ThemeToggle 
                variant="ghost" 
                size="sm" 
                className="p-2 hover:bg-muted/50 rounded-lg transition-all duration-200"
              />

              {/* Enhanced Language Selector */}
              <HeaderLanguageSelector />

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative p-2 hover:bg-muted/50 rounded-lg">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </Button>

              {/* User Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 hover:bg-muted/50">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src="/avatars/01.png" alt="User" />
                      <AvatarFallback className="bg-blue-600 text-white text-sm font-medium">
                        {getUserDisplayName().charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-gray-900">
                        {getUserDisplayName()}
                      </p>
                      <p className="text-xs leading-none text-gray-500">
                        {userRole}
                      </p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(profileTarget)}>
                    <User className="mr-2 h-4 w-4" />
                    <span>{t('header.profile')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t('header.settings')}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950 transition-all duration-300">
          {children}
        </main>
      </div>
      
      {/* Eye-Friendly Notification */}
      <EyeFriendlyNotification />
    </div>
  );
}; 