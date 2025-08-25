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
    { id: 'doc-ai', name: 'DocAI', icon: Bot, path: '/doc-ai' },
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 z-50 h-full bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out
        ${sidebarCollapsed ? 'w-16' : 'w-64'} 
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header with Logo */}
        <div className={`flex items-center justify-between ${sidebarCollapsed ? 'p-3' : 'p-6'} border-b border-gray-100 bg-white`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center w-full' : 'gap-3'}`}>
            <div className="flex-shrink-0">
              <img src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" alt="Company Logo" className={`${sidebarCollapsed ? 'h-8 w-8' : 'h-9 w-9'}`} />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="font-semibold text-gray-900 text-base">NexEagle</h1>
                <p className="text-sm text-gray-500">easyHMS</p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex h-8 w-8 p-0 hover:bg-gray-100 rounded-md transition-colors"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft className="h-4 w-4 text-gray-500" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav className={`${sidebarCollapsed ? 'p-2' : 'p-4'} space-y-1 mt-2`}>
          {navigation.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <Button
                key={item.id}
                variant="ghost"
                className={`
                  w-full group relative transition-all duration-200 flex items-center
                  ${sidebarCollapsed ? 'justify-center px-2 h-11 w-11 mx-auto rounded-lg' : 'justify-start gap-3 h-11 px-3 rounded-lg'}
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
                onClick={() => handleNavigation(item)}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <item.icon className={`${sidebarCollapsed ? 'h-5 w-5' : 'h-4 w-4'} transition-colors ${
                  isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
                }`} />
                
                {!sidebarCollapsed && (
                  <span className={`font-medium text-sm transition-colors ${
                    isActive ? 'text-blue-700' : 'text-gray-700 group-hover:text-gray-900'
                  }`}>
                    {item.name}
                  </span>
                )}
              </Button>
            );
          })}
        </nav>

        {/* Collapse/Expand Button for Collapsed State */}
        {sidebarCollapsed && (
          <div className="absolute top-4 right-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarCollapsed(false)}
              className="h-8 w-8 p-0 hover:bg-gray-100 rounded-md transition-colors bg-white shadow-sm border border-gray-200"
              title="Expand sidebar"
            >
              <ChevronRight className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
        )}

        {/* Logout Section */}
        <div className={`absolute bottom-4 ${sidebarCollapsed ? 'left-2 right-2' : 'left-4 right-4'}`}>
          <Button
            variant="ghost"
            className={`
              w-full group transition-all duration-200
              ${sidebarCollapsed ? 'justify-center px-2 h-11 w-11 mx-auto rounded-lg' : 'justify-start gap-3 h-11 px-3 rounded-lg'}
              text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200
            `}
            onClick={handleLogout}
            title={sidebarCollapsed ? "Logout" : undefined}
          >
            <LogOut className={`${sidebarCollapsed ? 'h-5 w-5' : 'h-4 w-4'} transition-colors`} />
            
            {!sidebarCollapsed && (
              <span className="font-medium text-sm">Logout</span>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className={`${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'} flex flex-col h-screen transition-all duration-300 ease-in-out`}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="h-5 w-5 text-gray-600" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 capitalize">
                  {currentPage === 'dashboard' ? 'Clinical Dashboard' : navigation.find(n => n.id === currentPage)?.name}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Welcome back, {getUserDisplayName()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Profile Completion Indicator */}
              {profileScore < 100 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(profileTarget)}
                  className="hidden md:flex items-center gap-2 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300"
                >
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Complete Profile ({profileScore}%)</span>
                </Button>
              )}

              {/* Notifications */}
              <Button variant="ghost" size="sm" className="relative p-2 hover:bg-gray-100 rounded-lg">
                <Bell className="h-5 w-5 text-gray-600" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </Button>

              {/* User Profile */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 hover:bg-gray-100">
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
                    <span>Profile</span>
                  </DropdownMenuItem>
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
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}; 