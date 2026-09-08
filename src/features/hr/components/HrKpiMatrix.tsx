import React from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Moon,
  Clock,
  AlertTriangle,
  IndianRupee,
  PhoneCall,
  UserX,
  ShieldAlert,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';
import { SeverityBadge } from './ShiftBadge';
import type { HrKpiSummary } from '../types';

interface HrKpiMatrixProps {
  kpi: HrKpiSummary;
  onLicenseAlertClick?: () => void;
  onLeaveClick?: () => void;
  onPayrollClick?: () => void;
}

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subtext?: string;
  gradient: string;
  glow: string;
  onClick?: () => void;
  pulse?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, subtext, gradient, glow, onClick, pulse }) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className={`
      relative overflow-hidden rounded-2xl p-4 cursor-pointer border
      bg-white/60 dark:bg-gray-900/60 backdrop-blur-md
      border-white/30 dark:border-gray-700/40
      shadow-lg hover:shadow-xl transition-all duration-300
      ${onClick ? 'cursor-pointer' : 'cursor-default'}
    `}
  >
    {/* Gradient accent */}
    <div className={`absolute inset-0 opacity-10 ${gradient}`} />

    {/* Glow on hover */}
    <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-20 blur-2xl ${glow}`} />

    <div className="relative z-10">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${gradient} shadow-lg`}>
          {icon}
        </div>
        {pulse && (
          <span className="flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">{value}</div>
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-0.5 uppercase tracking-wide">{label}</div>
      {subtext && <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtext}</div>}
    </div>
  </motion.div>
);

export const HrKpiMatrix: React.FC<HrKpiMatrixProps> = ({ kpi, onLicenseAlertClick, onLeaveClick, onPayrollClick }) => {
  const criticalAlerts = kpi.licenseExpiringSoon.filter(a => a.severity === 'CRITICAL' || a.daysUntilExpiry < 0);
  const payrollFormatted = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 }).format(kpi.currentMonthPayrollTotal);

  return (
    <div className="space-y-4">
      {/* License Expiry Alerts Banner */}
      {kpi.licenseExpiringSoon.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-red-200 dark:border-red-800/50 bg-red-50/80 dark:bg-red-950/40 backdrop-blur-md p-3 flex items-start gap-3"
        >
          <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/50 mt-0.5">
            <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-red-700 dark:text-red-300 mb-1.5">
              ⚠️ Clinical License Compliance Watchdog — {kpi.licenseExpiringSoon.length} Alert{kpi.licenseExpiringSoon.length > 1 ? 's' : ''}
            </div>
            <div className="flex flex-wrap gap-2">
              {kpi.licenseExpiringSoon.map(alert => (
                <div key={alert.employeeId} className="flex items-center gap-2 bg-white/70 dark:bg-gray-900/50 rounded-xl px-3 py-1.5 border border-red-100 dark:border-red-800/40">
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{alert.employeeName}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{alert.credentialType.split(' ')[0]}</span>
                  <SeverityBadge severity={alert.severity} daysLeft={alert.daysUntilExpiry} />
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={onLicenseAlertClick}
            className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline whitespace-nowrap"
          >
            View All →
          </button>
        </motion.div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          icon={<Users className="h-4 w-4 text-white" />}
          label="On Duty Today"
          value={<span>{kpi.activeOnDutyToday}<span className="text-base font-normal text-gray-400">/{kpi.totalStaff}</span></span>}
          subtext="Active staff"
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          glow="bg-emerald-400"
        />
        <KpiCard
          icon={<Moon className="h-4 w-4 text-white" />}
          label="Night Shift"
          value={kpi.nursesOnNightShift}
          subtext="Nurses on duty"
          gradient="bg-gradient-to-br from-indigo-500 to-violet-600"
          glow="bg-indigo-400"
        />
        <KpiCard
          icon={<PhoneCall className="h-4 w-4 text-white" />}
          label="On-Call Doctors"
          value={kpi.onCallDoctors}
          subtext="Standby today"
          gradient="bg-gradient-to-br from-rose-500 to-pink-600"
          glow="bg-rose-400"
        />
        <KpiCard
          icon={<Clock className="h-4 w-4 text-white" />}
          label="Leave Approvals"
          value={kpi.pendingLeaveApprovals}
          subtext="Awaiting review"
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          glow="bg-amber-400"
          onClick={onLeaveClick}
          pulse={kpi.pendingLeaveApprovals > 0}
        />
        <KpiCard
          icon={<UserX className="h-4 w-4 text-white" />}
          label="Absent Today"
          value={kpi.absentToday}
          subtext="Not punched in"
          gradient="bg-gradient-to-br from-slate-500 to-gray-600"
          glow="bg-slate-400"
        />
        <KpiCard
          icon={<IndianRupee className="h-4 w-4 text-white" />}
          label="Aug Payroll"
          value={payrollFormatted}
          subtext={kpi.payrollStatus === 'DRAFT' ? '● Draft — pending approval' : kpi.payrollStatus === 'APPROVED' ? '✓ Approved' : '✓ Disbursed'}
          gradient="bg-gradient-to-br from-sky-500 to-blue-600"
          glow="bg-sky-400"
          onClick={onPayrollClick}
        />
      </div>
    </div>
  );
};
