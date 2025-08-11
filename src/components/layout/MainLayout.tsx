import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useAppStore, useUserStore, useNotificationStore, useThemeStore } from '@/store';
import { useQueryClient } from '@tanstack/react-query';
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
  LogOut,
  Stethoscope,
  Home,
  UserCheck,
  CreditCard,
  Bot,
  MessageCircle,
  Send,
  Settings,
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
  FileText
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
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Calculate profile completion score
  const calculateProfileScore = () => {
    // TODO: Move setup data to Zustand store
    const profileData = null;
    if (!profileData) return 0;
    
    try {
      const data = JSON.parse(profileData);
      let completedFields = 0;
      const totalFields = 8; // Total number of profile fields
      
      if (data.name) completedFields++;
      if (data.email) completedFields++;
      if (data.mobile) completedFields++;
      if (data.specialization) completedFields++;
      if (data.experience) completedFields++;
      if (data.qualification) completedFields++;
      if (data.address) completedFields++;
      if (data.consultationFee) completedFields++;
      
      return Math.round((completedFields / totalFields) * 100);
    } catch {
      return 0;
    }
  };

  const profileScore = calculateProfileScore();
  const authStore = useAuthStore.getState();
  const userRole = authStore.getUserRole() || 'Doctor';
  const profileTarget = (userRole === 'Doctor' || userRole === 'AdminDoctor') ? '/profile?tab=professional' : '/profile';

  // Navigation items with role-based filtering
  const allNavigationItems: NavigationItem[] = [
    { id: 'admin', name: 'Admin Panel', icon: Settings, path: '/admin' },
    { id: 'dashboard', name: 'DocBoard', icon: Home, path: '/dashboard' },    
//{ id: 'calendar', name: 'Calendar', icon: Calendar, path: '/calendar' },
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
    if (item.id === 'dashboard' || item.id === 'doc-ai') {
      // Only show DocBoard and DocAI for Doctor and AdminDoctor roles
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
     // case 'calendar': return 'View your schedule and manage appointments efficiently.';
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
    //  case 'calendar': return ['Color-coded appointments', 'Drag & drop scheduling', 'Multiple view modes'];
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
        fixed top-0 left-0 z-50 h-full w-64 bg-card border-r transform transition-transform lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg">
              <img src="/Images/77834bc6-d9bc-41d2-8676-026af7cf79bc.png" alt="Company Logo" className="h-12 w-12" />
            </div>
            <div>
              <h1 className="font-bold text-healthcare-primary">NexEagle</h1>
              <p className="text-xs text-muted-foreground">easyHMS</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="p-4 space-y-2">
          <div className="space-y-2">
            {navigation.map((item) => (
              <Button
                key={item.id}
                variant={currentPage === item.id ? "default" : "ghost"}
                className="w-full justify-start gap-3"
                onClick={() => handleNavigation(item)}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Button>
            ))}
          </div>
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-healthcare-error hover:text-healthcare-error hover:bg-healthcare-error/10"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64 flex flex-col h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-card border-b px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold capitalize">
                {currentPage === 'dashboard' ? 'DocBoard' : navigation.find(n => n.id === currentPage)?.name}
              </h2>
            </div>

            <div className="flex items-center gap-4">
              {/* Profile Completion Meter */}
              <div className="hidden md:flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                <div className="w-16 h-2 bg-background rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-primary transition-all duration-300" 
                    style={{ width: `${profileScore}%` }}
                  />
                </div>
                <span className="text-xs font-medium">{profileScore}%</span>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-xs text-healthcare-primary"
                  onClick={() => navigate(profileTarget)}
                >
                  Complete Profile
                </Button>
              </div>

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
                         {userRole === 'Admin' ? 'A' : 'D'}
                       </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem className="font-normal">
                    <div className="flex flex-col space-y-1">
                                             <p className="text-sm font-medium leading-none">
                         {userRole === 'Admin' ? 'Administrator' : 'Doctor'}
                       </p>
                       <p className="text-xs leading-none text-muted-foreground">
                         {userRole === 'Admin' ? 'admin@nexeagle.com' : 'doctor@nexeagle.com'}
                       </p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate(profileTarget)}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
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