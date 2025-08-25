import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useAppStore, useUserStore, useNotificationStore, useThemeStore } from '@/store';
import { useQueryClient } from '@tanstack/react-query';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useUserDetails } from '@/hooks/useUserProfileApi';
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
// import { ContextualGuide } from './guide/ContextualGuide';
// import { DASHBOARD_GUIDES } from './guide/GuideData';

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

  // Profile completion hook
  const { completionPercentage, doctorProfileCompletion } = useProfileCompletion();
  
  const profileScore = completionPercentage;
  const authStore = useAuthStore.getState();
  const userRole = authStore.getUserRole() || 'Doctor';
  const userId = authStore.getUserId();
  const profileTarget = (userRole === 'Doctor' || userRole === 'AdminDoctor') ? '/profile?tab=professional' : '/profile';

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
    { id: 'admin', name: 'Admin Panel', icon: Settings, path: '/admin' },
    { id: 'dashboard', name: 'Clinical Dashboard', icon: Home, path: '/dashboard' },    
    { id: 'calendar', name: 'Doctor Calendar', icon: Calendar, path: '/calendar' },
    { id: 'appointments', name: 'Appointment Scheduler', icon: Calendar, path: '/appointment-dashboard' },
   // { id: 'billing', name: 'Billing', icon: CreditCard, path: '/billing' },
    { id: 'doc-ai', name: 'DocAI', icon: Bot, path: '/doc-ai' },
   // { id: 'chat', name: 'Chat', icon: MessageCircle, path: '/chat' },
   // { id: 'bulk-messaging', name: 'Bulk Messaging', icon: Send, path: '/bulk-messaging' },
  ];

  // Filter navigation items based on user role
  const navigation: NavigationItem[] = allNavigationItems.filter(item => {
    if (item.id === 'admin') {
      // Only show admin panel for Admin and AdminDoctor roles
      return userRole === 'Admin' || userRole === 'AdminDoctor';
    }
    if (item.id === 'dashboard' || item.id === 'doc-ai' || item.id === 'calendar') {
      // Only show DocBoard, DocAI, and Calendar for Doctor and AdminDoctor roles
      return userRole === 'Doctor' || userRole === 'AdminDoctor';
    }
    if (item.id === 'appointments') {
      // Show appointments for Admin, AdminDoctor, Receptionist, and Nurse roles
      return userRole === 'Admin' || userRole === 'AdminDoctor' || userRole === 'Receptionist' || userRole === 'Nurse';
    }
    return true; // Show all other items
  });

  // Get current page from location
  useEffect(() => {
    const currentPath = location.pathname;
    const navItem = navigation.find(item => item.path === currentPath);
    if (navItem) {
      setCurrentPage(navItem.id);
    }
  }, [location.pathname]);

  const getNavDescription = (id: string) => {
    switch (id) {
      case 'admin': return 'Manage users, system settings, and hospital configuration.';
      case 'dashboard': return 'Your main control center with key metrics and today\'s overview.';      
      case 'calendar': return 'View your schedule and manage appointments efficiently.';
      case 'appointments': return 'Book, reschedule, and manage patient appointments.';
    //  case 'billing': return 'Handle payments, insurance claims, and financial reports.';
    case 'doc-ai': return 'Get AI-powered medical assistance and clinical insights.';
//case 'chat': return 'Communicate with your team and colleagues instantly.';
     // case 'bulk-messaging': return 'Send notifications and messages to multiple patients.';
     // case 'patients': return 'Manage patient records and medical history.';
    //  case 'profile': return 'Update your profile and account settings.';
      default: return 'Navigate to this section for more features.';
    }
  };

  const getNavTips = (id: string) => {
    switch (id) {
      case 'admin': return ['User management', 'Role permissions', 'System configuration'];
      case 'dashboard': return ['View daily statistics', 'Quick access to all modules', 'Monitor hospital performance'];      
      case 'calendar': return ['Color-coded appointments', 'Drag & drop scheduling', 'Multiple view modes'];
      case 'appointments': return ['Real-time availability', 'Auto-conflict detection', 'SMS confirmations'];
      //case 'billing': return ['Multiple payment methods', 'Insurance processing', 'Automated reports'];
      case 'doc-ai': return ['Medical consultations', 'Drug interactions', 'Diagnosis assistance'];
     // case 'chat': return ['Team communication', 'File sharing', 'Real-time messaging'];
     // case 'bulk-messaging': return ['Patient notifications', 'Appointment reminders', 'Health campaigns'];
     // case 'patients': return ['Patient records', 'Medical history', 'Treatment plans'];
     // case 'profile': return ['Personal information', 'Account settings', 'Preferences'];
      default: return ['Explore features', 'Easy navigation'];
    }
  };

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
    logout(); // Auth store
    resetAppState(); // App store
    resetUserState(); // User store
    clearNotifications(); // Notification store
    resetColors(); // Theme store
    
    // Navigate to home page
    navigate('/');
  };
  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 z-50 h-full bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out shadow-lg
        ${sidebarCollapsed ? 'w-16' : 'w-56'} 
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header with Logo */}
        <div className={`flex items-center justify-between ${sidebarCollapsed ? 'p-2' : 'p-4'} border-b border-gray-200 bg-slate-50`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center w-full' : 'gap-4'}`}>
            <div className="flex-shrink-0">
              <img src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" alt="Company Logo" className={`${sidebarCollapsed ? 'h-8 w-8' : 'h-10 w-10'}`} />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="font-bold text-slate-900 text-lg">NexEagle</h1>
                <p className="text-sm text-slate-600 font-medium">easyHMS</p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="hidden lg:flex h-8 w-8 p-0 hover:bg-gray-100/80 rounded-lg transition-all duration-200"
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden hover:bg-gray-100/80 rounded-lg"
              >
                <X className="h-4 w-4 text-gray-600" />
              </Button>
            </div>
          )}
        </div>

        <nav className={`${sidebarCollapsed ? 'p-2' : 'p-4'} space-y-1`}>
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={`
                    w-full group relative overflow-hidden transition-all duration-300 ease-in-out flex items-center
                    ${sidebarCollapsed ? 'justify-center px-1 h-12 w-12 mx-auto' : 'justify-start gap-3 h-12 px-4'}
                    ${isActive 
                      ? 'bg-slate-100 text-slate-900 shadow-sm border-l-4 border-slate-600' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:shadow-sm'
                    }
                  `}
                  onClick={() => handleNavigation(item)}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-600 rounded-r-full"></div>
                  )}
                  
                  {/* Icon with enhanced styling */}
                  <div className={`
                    ${sidebarCollapsed ? 'p-1.5' : 'p-2'} rounded-md transition-all duration-300 flex-shrink-0
                    ${isActive 
                      ? 'bg-slate-200 shadow-sm' 
                      : 'bg-slate-100 group-hover:bg-slate-200 group-hover:shadow-sm'
                    }
                  `}>
                    <item.icon className={`${sidebarCollapsed ? 'h-5 w-5' : 'h-4 w-4'} transition-all duration-300 ${
                      isActive ? 'text-slate-700' : 'text-slate-500 group-hover:text-slate-700'
                    }`} />
                  </div>
                  
                  {/* Text with enhanced styling */}
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0 text-left">
                      <span className={`font-medium text-sm transition-all duration-300 ${
                        isActive ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'
                      }`}>
                        {item.name}
                      </span>
                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                        {getNavDescription(item.id)}
                      </div>
                    </div>
                  )}
                  
                  {/* Active indicator dot */}
                  {isActive && !sidebarCollapsed && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                    </div>
                  )}
                </Button>
              );
            })}
          </div>
        </nav>

        {/* Collapse/Expand Button for Collapsed State */}
        {sidebarCollapsed && (
          <div className="absolute top-4 right-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(false)}
              className="h-8 w-8 p-0 hover:bg-gray-100/80 rounded-lg transition-all duration-200 bg-white/80 shadow-sm"
              title="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4 text-gray-600" />
            </Button>
          </div>
        )}

        {/* Logout Section */}
        <div className={`absolute bottom-4 ${sidebarCollapsed ? 'left-2 right-2' : 'left-4 right-4'}`}>
          <div className="bg-slate-50 rounded-lg p-2 border border-slate-200">
            <Button
              variant="ghost"
              className={`
                w-full group relative overflow-hidden transition-all duration-300 ease-in-out
                ${sidebarCollapsed ? 'justify-center px-2 h-12' : 'justify-start gap-3 h-12 px-3'}
                text-slate-600 hover:text-slate-700 hover:bg-slate-100
              `}
              onClick={handleLogout}
              title={sidebarCollapsed ? "Logout" : undefined}
            >
              {/* Icon with enhanced styling */}
              <div className={`${sidebarCollapsed ? 'p-1.5' : 'p-2'} rounded-md transition-all duration-300 flex-shrink-0 bg-slate-100 group-hover:bg-slate-200`}>
                <LogOut className={`${sidebarCollapsed ? 'h-5 w-5' : 'h-4 w-4'}`} />
              </div>
              
              {/* Text */}
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <span className="font-medium text-sm">Logout</span>
                  <div className="text-xs text-slate-500 mt-0.5">Sign out of your account</div>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-56'} flex flex-col h-screen transition-all duration-300 ease-in-out`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-card border-b px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold capitalize">
                {currentPage === 'dashboard' ? 'Clinical Dashboard' : navigation.find(n => n.id === currentPage)?.name}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              {/* Enhanced Profile Completion Meter */}
              {profileScore < 100 ? (
                <div className="hidden md:flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg px-3 py-2 border border-amber-200/50 dark:border-amber-800/50 shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
                     onClick={() => navigate(profileTarget)}>
                  {/* Animated Progress Circle */}
                  <div className="relative w-8 h-8">
                    <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
                      {/* Background circle */}
                      <circle
                        cx="16"
                        cy="16"
                        r="12"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                        className="text-amber-200 dark:text-amber-800"
                      />
                      {/* Progress circle with animation */}
                      <circle
                        cx="16"
                        cy="16"
                        r="12"
                        stroke="url(#profileGradient)"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={`${(profileScore / 100) * 75.4} 75.4`}
                        className="transition-all duration-1000 ease-out animate-pulse"
                      />
                      <defs>
                        <linearGradient id="profileGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#ea580c" />
                        </linearGradient>
                      </defs>
                    </svg>
                    {/* Percentage text */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{profileScore}%</span>
                    </div>
                    {/* Pulsing dot */}
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full animate-ping opacity-75"></div>
                  </div>
                  
                  {/* Text content */}
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-200 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors">
                      Complete Profile
                    </span>
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      {100 - profileScore}% remaining
                    </span>
                  </div>
                  
                  {/* Animated arrow */}
                  <div className="text-amber-600 dark:text-amber-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    <svg className="w-3 h-3 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="hidden md:flex items-center gap-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg px-3 py-2 border border-green-200/50 dark:border-green-800/50 shadow-sm hover:shadow-md transition-all duration-300 group cursor-pointer"
                     onClick={() => navigate(profileTarget)}>
                  {/* Success circle with animation */}
                  <div className="relative w-8 h-8">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-pulse">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    {/* Success sparkles */}
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                    <div className="absolute -bottom-0.5 -left-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping animation-delay-300"></div>
                  </div>
                  
                  {/* Text content */}
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-green-800 dark:text-green-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                      Profile Complete!
                    </span>
                    <span className="text-xs text-green-600 dark:text-green-400">
                      All set up
                    </span>
                  </div>
                  
                  {/* Animated arrow */}
                  <div className="text-green-600 dark:text-green-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    <svg className="w-3 h-3 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              )}

              

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-healthcare-error rounded-full"></span>
              </Button>

              {/* User Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/avatars/01.png" alt="User" />
                      <AvatarFallback className="bg-healthcare-primary text-white text-xs font-medium">
                        {getUserDisplayName().charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {getUserDisplayName()}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {userRole}
                      </p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(profileTarget)}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}; 