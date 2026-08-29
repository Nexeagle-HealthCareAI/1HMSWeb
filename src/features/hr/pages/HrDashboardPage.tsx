import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users2,
  CalendarDays,
  UmbrellaOff,
  IndianRupee,
  Stethoscope,
  LayoutDashboard,
  Fingerprint,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { HrKpiMatrix } from '../components/HrKpiMatrix';
import { EmployeeVault } from '../components/EmployeeVault';
import { EmployeeDrawer } from '../components/EmployeeDrawer';
import { AddEmployeeModal } from '../components/AddEmployeeModal';
import { DutyRosterPlanner } from '../components/DutyRosterPlanner';
import { LeaveConsole } from '../components/LeaveConsole';
import { AttendanceExceptions } from '../components/AttendanceExceptions';
import { PayrollWizard } from '../components/PayrollWizard';
import { useHrKpi } from '../hrApi';
import type { HrEmployee } from '../types';

type HrTab = 'overview' | 'employees' | 'roster' | 'leave' | 'attendance' | 'payroll';

const HR_TABS: { id: HrTab; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: <LayoutDashboard className="h-4 w-4" />,
    description: 'KPIs & Alerts',
  },
  {
    id: 'employees',
    label: 'Staff Directory',
    icon: <Users2 className="h-4 w-4" />,
    description: 'Employee Vault',
  },
  {
    id: 'roster',
    label: '24/7 Roster',
    icon: <CalendarDays className="h-4 w-4" />,
    description: 'Duty Planner',
  },
  {
    id: 'leave',
    label: 'Leave Console',
    icon: <UmbrellaOff className="h-4 w-4" />,
    description: 'Leave & Comp-Off',
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: <Fingerprint className="h-4 w-4" />,
    description: 'Exceptions & Punches',
  },
  {
    id: 'payroll',
    label: 'Payroll',
    icon: <IndianRupee className="h-4 w-4" />,
    description: '1-Click Payroll',
  },
];

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export const HrDashboardPage: React.FC = () => {
  const hospitalId = useAuthStore(s => s.hospitalId) || 'hosp-1';
  const [activeTab, setActiveTab] = useState<HrTab>('employees');
  const [selectedEmployee, setSelectedEmployee] = useState<HrEmployee | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const { data: kpi, isLoading: kpiLoading } = useHrKpi(hospitalId);

  const handleEmployeeSelect = (employee: HrEmployee) => {
    setSelectedEmployee(employee);
    setIsDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setIsDrawerOpen(false);
    setTimeout(() => setSelectedEmployee(null), 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 shadow-lg shadow-brand-500/30">
                <Users2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
                  1HR Suite
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Hospital Workforce Management — August 2026</p>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
              <Fingerprint className="h-3.5 w-3.5" />
              ZKTeco Online
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
              <Building2 className="h-3.5 w-3.5" />
              84 Staff
            </div>
          </div>
        </motion.div>

        {/* KPI Matrix — always visible */}
        {kpi && (
          <HrKpiMatrix
            kpi={kpi}
            onLeaveClick={() => setActiveTab('leave')}
            onPayrollClick={() => setActiveTab('payroll')}
          />
        )}
        {kpiLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            ))}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-gray-100/80 dark:bg-gray-900/50 rounded-2xl border border-gray-200/60 dark:border-gray-700/40 overflow-x-auto">
          {HR_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-700'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'leave' && kpi && kpi.pendingLeaveApprovals > 0 && (
                <span className="ml-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full bg-amber-500 text-white">
                  {kpi.pendingLeaveApprovals}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* License Expiry detail list */}
                {kpi && kpi.licenseExpiringSoon.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/50 backdrop-blur-sm p-4">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <span>⚠️</span> License Expiry Alerts
                    </h3>
                    <div className="space-y-2">
                      {kpi.licenseExpiringSoon.map(alert => (
                        <div key={alert.employeeId} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800/60 last:border-0">
                          <div>
                            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{alert.employeeName}</div>
                            <div className="text-xs text-gray-400">{alert.credentialType}</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-xs font-bold ${alert.daysUntilExpiry < 0 ? 'text-red-600 dark:text-red-400' : alert.daysUntilExpiry <= 7 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                              {alert.daysUntilExpiry < 0 ? '⛔ EXPIRED' : `${alert.daysUntilExpiry} days left`}
                            </div>
                            <div className="text-xs text-gray-400">{alert.expiryDate}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick navigate card */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/50 backdrop-blur-sm p-4">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Quick Access</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {HR_TABS.filter(t => t.id !== 'overview').map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="flex items-center gap-2 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all text-left group"
                      >
                        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/40 text-gray-500 dark:text-gray-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                          {tab.icon}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">{tab.label}</div>
                          <div className="text-xs text-gray-400">{tab.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'employees' && (
              <EmployeeVault
                hospitalId={hospitalId}
                onEmployeeSelect={handleEmployeeSelect}
                onAddEmployee={() => setIsAddModalOpen(true)}
              />
            )}

            {activeTab === 'roster' && <DutyRosterPlanner hospitalId={hospitalId} />}
            {activeTab === 'leave' && <LeaveConsole hospitalId={hospitalId} />}
            {activeTab === 'attendance' && <AttendanceExceptions hospitalId={hospitalId} />}
            {activeTab === 'payroll' && <PayrollWizard hospitalId={hospitalId} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Employee Detail Drawer */}
      <EmployeeDrawer
        employee={selectedEmployee}
        isOpen={isDrawerOpen}
        onClose={handleDrawerClose}
      />

      {/* Add Employee Modal */}
      <AddEmployeeModal
        hospitalId={hospitalId}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
};

export default HrDashboardPage;
