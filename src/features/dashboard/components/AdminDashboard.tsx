import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  AppointmentOversightModule,
  BillingInsuranceModule,
  BulkMessagingModule,
  SystemConfigModule,
  AuditSecurityModule
} from './index';
// Removed ProfileCompletionBanner from Admin panel
import { useHospitalApi } from '@/hooks/useApi';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';



export const AdminDashboard = () => {
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState('today');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentView, setCurrentView] = useState('dashboard');
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

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



  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
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
          <span className="text-xs lg:text-sm text-muted-foreground ml-1 hidden sm:inline">vs last period</span>
        </div>
      </CardContent>
    </Card>
  );

  const adminModules = [
    { id: 'dashboard', name: 'DashBoard', icon: Activity, description: 'Overview & Analytics' },
    { id: 'user-management', name: 'User Management', icon: Shield, description: 'Users, Roles & Permissions' },
    { id: 'patient-management', name: 'Patient Management', icon: Users, description: 'Patient Records & Data' },
//{ id: 'appointment-oversight', name: 'Appointment Oversight', icon: Calendar, description: 'Appointment Management' },
    //{ id: 'billing-insurance', name: 'Billing & Insurance', icon: CreditCard, description: 'Financial Management' },
//{ id: 'bulk-messaging', name: 'Bulk Messaging', icon: MessageSquare, description: 'Communication Management' },
    { id: 'system-config', name: 'System Configuration', icon: Cog, description: 'Hospital Settings' },
   // { id: 'audit-security', name: 'Audit & Security', icon: ShieldCheck, description: 'Logs & Security' }
  ];



  return (
    <div className="min-h-screen w-full p-4 lg:p-6 space-y-6 bg-gradient-subtle">
      {/* Hospital Registration Meter - show until 100% */}
      {hospitalScore < 100 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600 rounded-full">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-blue-900 dark:text-blue-100">
                  🏥 Hospital Registration Progress
                </h2>
                <p className="text-blue-700 dark:text-blue-300">
                  Complete hospital details to unlock all admin features
                </p>
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-1">{hospitalScore}%</div>
              <div className="text-sm text-blue-500 uppercase tracking-wide">Complete</div>
            </div>
          </div>
          
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Progress</span>
              <span className="text-sm text-blue-600">{hospitalScore}/100%</span>
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-600 to-blue-500 h-4 rounded-full transition-all duration-500 ease-out relative"
                style={{ width: `${hospitalScore}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              {!accessUnlocked ? (
                <>
                  <X className="h-4 w-4 text-red-500" />
                  <span className="text-red-700 dark:text-red-300 font-medium">
                    Admin features locked - Complete required fields
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-green-700 dark:text-green-300 font-medium">
                    Basic features unlocked - Complete for full access
                  </span>
                </>
              )}
            </div>
            
            <Button 
              onClick={() => setCurrentView('system-config-hospital')} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2"
            >
              {!accessUnlocked ? 'Complete Hospital Info' : 'Update Hospital Details'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      {/* Removed the completion banner at 100% as requested */}

      {/* Profile completion banner removed for Admin panel */}

      {/* Setup Dialog - Removed WelcomeSetup component */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <div className="text-center py-8">
            <h2 className="text-2xl font-bold mb-4">Setup Complete</h2>
            <p className="text-muted-foreground mb-6">
              Welcome to NexEagle HMS! Your hospital management system is ready to use.
            </p>
            <Button onClick={() => setShowSetupDialog(false)}>
              Get Started
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">Admin Board</h1>
            {hospitalScore === 100 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 px-2.5 py-0.5 shadow-sm text-[11px] font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Hospital setup 100%
              </span>
            )}
          </div>
          <p className="text-muted-foreground">Hospital Management Overview</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select defaultValue="today">
            <SelectTrigger className="w-[120px] sm:w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Admin Navigation Modules */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 lg:gap-4">
        {adminModules.map((module) => {
          const isLocked = !accessUnlocked && module.id !== 'dashboard' && module.id !== 'system-config';
          
          return (
            <Card 
              key={module.id}
              className={`cursor-pointer transition-all relative ${
                isLocked 
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' 
                  : currentView === module.id 
                    ? 'ring-2 ring-primary bg-primary/5 hover:shadow-lg' 
                    : 'hover:bg-muted/50 hover:shadow-lg'
              }`}
              onClick={() => {
                if (!isLocked) {
                  setCurrentView(module.id);
                } else {
                  toast({
                    title: "Feature Locked",
                    description: "Complete hospital registration to unlock this feature.",
                    variant: "destructive"
                  });
                }
              }}
            >
              <CardContent className="p-3 lg:p-4 text-center">
                <div className="relative">
                  <module.icon className={`h-6 w-6 lg:h-8 lg:w-8 mx-auto mb-2 ${
                    isLocked 
                      ? 'text-gray-400' 
                      : currentView === module.id 
                        ? 'text-primary' 
                        : 'text-muted-foreground'
                  }`} />
                  {isLocked && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1">
                      <X className="h-3 w-3" />
                    </div>
                  )}
                </div>
                <h3 className={`font-medium text-xs lg:text-sm mb-1 ${
                  isLocked 
                    ? 'text-gray-400' 
                    : currentView === module.id 
                      ? 'text-primary' 
                      : 'text-foreground'
                }`}>
                  {module.name}
                </h3>
                <p className={`text-xs hidden sm:block ${
                  isLocked ? 'text-gray-400' : 'text-muted-foreground'
                }`}>
                  {isLocked ? 'Locked' : module.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
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

      {/* Appointment Oversight Module */}
      {currentView === 'appointment-oversight' && <AppointmentOversightModule />}

      {/* System Configuration Module */}
      {currentView === 'system-config' && <SystemConfigModule />}

      {/* Hospital Registration Module */}
      {currentView === 'system-config-hospital' && (
        <div data-module="system-config-hospital">
          <SystemConfigModule focusTab="hospital" />
        </div>
      )}

      {/* Billing & Insurance Module */}
      {currentView === 'billing-insurance' && <BillingInsuranceModule />}

      {/* Bulk Messaging Module */}
      {currentView === 'bulk-messaging' && <BulkMessagingModule />}

      {/* Audit & Security Module */}
      {currentView === 'audit-security' && (
        <AuditSecurityModule 
          moduleName={adminModules.find(m => m.id === currentView)?.name || 'Audit & Security'}
          moduleDescription={adminModules.find(m => m.id === currentView)?.description || 'Logs & Security'}
          moduleIcon={adminModules.find(m => m.id === currentView)?.icon || ShieldCheck}
        />
      )}
    </div>
  );
};
