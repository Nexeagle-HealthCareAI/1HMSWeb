import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Sparkles, Activity, CalendarDays, ChevronLeft, ChevronRight, LayoutDashboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Tab = 'today' | 'patient360';

export const PatientsPage: React.FC = () => {
  const { t } = useTranslation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('today');

  const navItems = [
    {
      id: 'today' as Tab,
      label: 'Today Appointment',
      icon: CalendarDays,
    },
    {
      id: 'patient360' as Tab,
      label: 'Patient 360',
      icon: Users,
    },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out flex flex-col z-20 relative",
          isSidebarCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Toggle Button */}
        <div className="absolute -right-3 top-6 z-30">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Sidebar Header */}
        <div className={cn(
          "h-16 flex items-center border-b border-dashed border-gray-200 dark:border-gray-800",
          isSidebarCollapsed ? "justify-center px-0" : "px-6"
        )}>
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <LayoutDashboard className="h-6 w-6" />
            {!isSidebarCollapsed && (
              <span className="font-bold text-lg tracking-tight">Workspace</span>
            )}
          </div>
        </div>

        {/* Nav Items */}
        <div className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex items-center w-full p-3 rounded-xl transition-all duration-200 group relative",
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-gray-200",
                  isSidebarCollapsed ? "justify-center" : "gap-3"
                )}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors",
                  isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300"
                )} />

                {!isSidebarCollapsed && (
                  <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>
                )}

                {isActive && !isSidebarCollapsed && (
                  <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                )}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative w-full h-full bg-gray-50/50 dark:bg-black/20">
        {activeTab === 'today' && (
          <div className="flex items-center justify-center min-h-full px-4 py-8">
            <Card className="w-full max-w-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-0 shadow-xl overflow-hidden relative group">

              {/* Decorative background elements - Green theme for Appointments */}
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-green-500/10 rounded-full blur-3xl group-hover:bg-green-500/20 transition-all duration-700"></div>
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl group-hover:bg-teal-500/20 transition-all duration-700"></div>

              <CardContent className="flex flex-col items-center justify-center p-16 text-center relative z-10">
                <div className="mb-8 relative">
                  <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                  <div className="bg-gradient-to-br from-green-500 to-teal-600 p-6 rounded-2xl shadow-lg relative transform group-hover:scale-110 transition-transform duration-500">
                    <CalendarDays className="h-12 w-12 text-white" />
                  </div>
                </div>

                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-teal-600 dark:from-green-400 dark:to-teal-400 mb-4 tracking-tight">
                  Upcoming Appointments
                </h1>

                <div className="h-1 w-24 bg-gradient-to-r from-green-500 to-teal-500 rounded-full mb-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
                </div>

                <p className="text-xl text-gray-600 dark:text-gray-300 font-medium mb-2">
                  Daily Schedule View is Coming Soon
                </p>

                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                  We are building a streamlined view for your daily appointments and schedule management.
                </p>

                <div className="mt-10 flex gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 ring-1 ring-inset ring-green-700/10">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    In Development
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'patient360' && (
          <div className="flex items-center justify-center min-h-full px-4 py-8">
            <Card className="w-full max-w-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-0 shadow-xl overflow-hidden relative group">

              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700"></div>
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700"></div>

              <CardContent className="flex flex-col items-center justify-center p-16 text-center relative z-10">
                <div className="mb-8 relative">
                  <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full scale-150 animate-pulse"></div>
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-6 rounded-2xl shadow-lg relative transform group-hover:scale-110 transition-transform duration-500">
                    <Users className="h-12 w-12 text-white" />
                  </div>

                  {/* Floating particles */}
                  <Activity className="absolute -top-4 -right-6 h-6 w-6 text-blue-400 animate-bounce delay-100" />
                  <Sparkles className="absolute -bottom-2 -left-6 h-5 w-5 text-purple-400 animate-pulse delay-700" />
                </div>

                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 mb-4 tracking-tight">
                  Patient 360
                </h1>

                <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-white/30 animate-shimmer"></div>
                </div>

                <p className="text-xl text-gray-600 dark:text-gray-300 font-medium mb-2">
                  A Comprehensive View is Coming Soon
                </p>

                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                  We are crafting a unified experience to visualize patient history, vitals, and appointments all in one place.
                </p>

                <div className="mt-10 flex gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 ring-1 ring-inset ring-blue-700/10">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    In Development
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};