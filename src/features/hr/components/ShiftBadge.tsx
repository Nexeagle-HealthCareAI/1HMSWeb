import React from 'react';
import { cn } from '@/lib/utils';
import type { ShiftCode } from '../types';

interface ShiftBadgeProps {
  shiftCode: ShiftCode;
  shiftName?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const SHIFT_CONFIG: Record<ShiftCode, { label: string; bg: string; text: string; border: string; icon: string }> = {
  SFT_M: {
    label: 'Morning',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: '🌅',
  },
  SFT_E: {
    label: 'Evening',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    icon: '🌇',
  },
  SFT_N: {
    label: 'Night',
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    icon: '🌙',
  },
  SFT_G: {
    label: 'General',
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    text: 'text-violet-700 dark:text-violet-300',
    border: 'border-violet-200 dark:border-violet-800',
    icon: '💼',
  },
  SFT_CALL: {
    label: 'On-Call',
    bg: 'bg-rose-100 dark:bg-rose-900/30',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    icon: '📞',
  },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-1 gap-1',
  lg: 'text-sm px-3 py-1.5 gap-1.5',
};

export const ShiftBadge: React.FC<ShiftBadgeProps> = ({ shiftCode, shiftName, size = 'md', showIcon = true }) => {
  const config = SHIFT_CONFIG[shiftCode];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        config.bg, config.text, config.border,
        SIZE_CLASSES[size]
      )}
    >
      {showIcon && <span>{config.icon}</span>}
      {shiftName ?? config.label}
    </span>
  );
};

// ─── Employment Type Badge ────────────────────────────────────────────────────

import type { EmploymentType } from '../types';

interface EmploymentTypeBadgeProps {
  type: EmploymentType;
}

const EMP_TYPE_CONFIG: Record<EmploymentType, { label: string; bg: string; text: string; border: string; icon: string }> = {
  FULL_TIME_SALARIED: {
    label: 'Salaried',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: '💰',
  },
  VISITING_CONSULTANT: {
    label: 'Consultant',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    icon: '🩺',
  },
  CONTRACTUAL: {
    label: 'Contract',
    bg: 'bg-sky-100 dark:bg-sky-900/30',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-200 dark:border-sky-800',
    icon: '📋',
  },
  INTERN: {
    label: 'Intern',
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    icon: '🎓',
  },
};

export const EmploymentTypeBadge: React.FC<EmploymentTypeBadgeProps> = ({ type }) => {
  const config = EMP_TYPE_CONFIG[type];
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border text-xs px-2 py-0.5 font-medium',
      config.bg, config.text, config.border
    )}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
};

// ─── Track Badge ──────────────────────────────────────────────────────────────

import type { PayrollTrack } from '../types';

export const TrackBadge: React.FC<{ track: PayrollTrack }> = ({ track }) => {
  if (track === 'TRACK_A_SALARIED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs px-2 py-0.5 font-semibold">
        Sec 192
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 text-xs px-2 py-0.5 font-semibold">
      Sec 194J
    </span>
  );
};

// ─── License Alert Severity Badge ────────────────────────────────────────────

import type { LicenseAlertSeverity } from '../types';

export const SeverityBadge: React.FC<{ severity: LicenseAlertSeverity; daysLeft: number }> = ({ severity, daysLeft }) => {
  if (daysLeft < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-xs px-2 py-0.5 font-bold">
        ⚠️ EXPIRED
      </span>
    );
  }
  if (severity === 'CRITICAL') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-xs px-2 py-0.5 font-bold animate-pulse">
        🔴 {daysLeft}d left
      </span>
    );
  }
  if (severity === 'HIGH') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-xs px-2 py-0.5 font-bold">
        🟡 {daysLeft}d left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs px-2 py-0.5 font-medium">
      🔵 {daysLeft}d left
    </span>
  );
};
