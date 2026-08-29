import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Filter,
  ChevronRight,
  Phone,
  Mail,
  Calendar,
  Building2,
  Award,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useHrEmployees } from '../hrApi';
import { EmploymentTypeBadge, TrackBadge } from './ShiftBadge';
import type { HrEmployee, EmploymentType } from '../types';
import { format, differenceInDays, parseISO } from 'date-fns';

interface EmployeeVaultProps {
  hospitalId: string;
  onEmployeeSelect: (employee: HrEmployee) => void;
  onAddEmployee: () => void;
}

const AVATAR_COLORS = [
  'from-emerald-400 to-teal-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-sky-400 to-blue-500',
  'from-amber-400 to-orange-500',
  'from-indigo-400 to-violet-500',
];

function getInitials(first: string, last: string) {
  return `${first[0]}${last[0]}`.toUpperCase();
}

function getAvatarColor(id: string) {
  const idx = id.charCodeAt(id.length - 1) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function getLicenseStatus(employee: HrEmployee): 'ok' | 'warning' | 'critical' | 'none' {
  if (!employee.credentials?.length) return 'none';
  const now = new Date();
  for (const cred of employee.credentials) {
    const expiry = parseISO(cred.licenseValidUntil);
    const diff = differenceInDays(expiry, now);
    if (diff < 0 || (cred.blsExpiryDate && differenceInDays(parseISO(cred.blsExpiryDate), now) < 0)) return 'critical';
    if (diff <= 30) return 'critical';
    if (diff <= 60) return 'warning';
  }
  return 'ok';
}

const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME_SALARIED: 'Full-Time',
  VISITING_CONSULTANT: 'Consultant',
  CONTRACTUAL: 'Contract',
  INTERN: 'Intern',
};

export const EmployeeVault: React.FC<EmployeeVaultProps> = ({ hospitalId, onEmployeeSelect, onAddEmployee }) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const { data: employees = [], isLoading, refetch } = useHrEmployees({
    search: search || undefined,
    employmentType: typeFilter !== 'all' ? typeFilter as EmploymentType : undefined,
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search staff, ID, role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border-gray-200 dark:border-gray-700 rounded-xl"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm border-gray-200 dark:border-gray-700 rounded-xl">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="FULL_TIME_SALARIED">Full-Time Salaried</SelectItem>
              <SelectItem value="VISITING_CONSULTANT">Visiting Consultant</SelectItem>
              <SelectItem value="CONTRACTUAL">Contractual</SelectItem>
              <SelectItem value="INTERN">Intern</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 rounded-xl border-gray-200 dark:border-gray-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl border-gray-200 dark:border-gray-700"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button
            size="sm"
            onClick={onAddEmployee}
            className="gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0 shadow-lg shadow-emerald-500/25"
          >
            <Plus className="h-4 w-4" />
            Add Staff
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-3 flex-wrap">
        {(['FULL_TIME_SALARIED', 'VISITING_CONSULTANT', 'CONTRACTUAL', 'INTERN'] as EmploymentType[]).map(type => {
          const count = employees.filter(e => e.employmentType === type).length;
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                typeFilter === type
                  ? 'bg-brand-50 dark:bg-brand-900/30 border-brand-200 dark:border-brand-700 text-brand-700 dark:text-brand-300'
                  : 'bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
              }`}
            >
              {EMPLOYMENT_TYPE_LABELS[type]} <span className="font-bold ml-1">{count}</span>
            </button>
          );
        })}
        <span className="text-xs text-gray-400 dark:text-gray-500 self-center ml-1">
          Total: <span className="font-semibold text-gray-700 dark:text-gray-300">{employees.length}</span>
        </span>
      </div>

      {/* Employee Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No staff found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <AnimatePresence>
            {employees.map((employee, idx) => {
              const licenseStatus = getLicenseStatus(employee);
              const avatarGradient = getAvatarColor(employee.id);
              const initials = getInitials(employee.firstName, employee.lastName);
              const joiningDate = format(parseISO(employee.dateOfJoining), 'MMM yyyy');

              return (
                <motion.div
                  key={employee.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.04, duration: 0.3 }}
                  onClick={() => onEmployeeSelect(employee)}
                  className="group relative rounded-2xl border bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border-gray-200/60 dark:border-gray-700/40 p-4 cursor-pointer hover:shadow-xl hover:border-brand-300 dark:hover:border-brand-600 transition-all duration-300 hover:-translate-y-1"
                >
                  {/* License status indicator */}
                  {licenseStatus !== 'none' && licenseStatus !== 'ok' && (
                    <div className={`absolute top-3 right-3 h-2.5 w-2.5 rounded-full ${
                      licenseStatus === 'critical' ? 'bg-red-500 animate-pulse' : 'bg-amber-400'
                    }`} title={licenseStatus === 'critical' ? 'License expiring/expired' : 'License renewal soon'} />
                  )}
                  {licenseStatus === 'ok' && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                  )}

                  {/* Status indicator for inactive/on-leave */}
                  {employee.status !== 'ACTIVE' && (
                    <div className="absolute top-3 left-3">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        employee.status === 'ON_LEAVE'
                          ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      }`}>{employee.status.replace('_', ' ')}</span>
                    </div>
                  )}

                  {/* Avatar */}
                  <div className="flex flex-col items-center text-center mb-3 pt-2">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-bold text-lg shadow-lg mb-2.5`}>
                      {initials}
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                      {employee.firstName} {employee.lastName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{employee.designation}</div>
                  </div>

                  {/* Info pills */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">{employee.departmentName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="h-3 w-3 shrink-0" />
                      <span>Joined {joiningDate}</span>
                      {employee.contactNumber && (
                        <>
                          <span className="mx-1">·</span>
                          <Phone className="h-3 w-3 shrink-0" />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Badge row */}
                  <div className="flex items-center justify-between">
                    <EmploymentTypeBadge type={employee.employmentType} />
                    <TrackBadge track={employee.payrollTrack} />
                  </div>

                  {/* Employee code */}
                  <div className="mt-2 text-[10px] font-mono text-gray-400 dark:text-gray-600 text-center">
                    {employee.employeeCode}
                  </div>

                  {/* Hover arrow */}
                  <div className="absolute bottom-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="h-4 w-4 text-brand-400" />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

// Fix missing icon
const Users = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
);
