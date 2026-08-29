import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Clock,
  LogOut,
  CalendarX,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  MoreVertical
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { useAttendanceExceptions } from '../hrApi';

export const AttendanceExceptions: React.FC<{ hospitalId: string }> = ({ hospitalId }) => {
  const endDate = new Date().toISOString();
  const startDate = subDays(new Date(), 7).toISOString();
  
  const { data: exceptions, isLoading } = useAttendanceExceptions(hospitalId, startDate, endDate);
  
  const [filterType, setFilterType] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  const filteredExceptions = exceptions?.filter(ex => {
    if (filterType !== 'ALL' && ex.exceptionType !== filterType) return false;
    if (search) {
      const q = search.toLowerCase();
      return ex.employeeName.toLowerCase().includes(q) || ex.employeeCode.toLowerCase().includes(q);
    }
    return true;
  });

  const getExceptionIcon = (type: string) => {
    switch (type) {
      case 'LATE': return <Clock className="h-5 w-5 text-amber-500" />;
      case 'MISSING_OUT_PUNCH': return <LogOut className="h-5 w-5 text-red-500" />;
      case 'MISSING_IN_PUNCH': return <LogOut className="h-5 w-5 text-red-500" />;
      case 'UNSCHEDULED': return <CalendarX className="h-5 w-5 text-purple-500" />;
      default: return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getExceptionBadge = (type: string) => {
    switch (type) {
      case 'LATE':
        return <span className="px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-xs font-bold">LATE ARRIVAL</span>;
      case 'MISSING_OUT_PUNCH':
      case 'MISSING_IN_PUNCH':
        return <span className="px-2.5 py-1 rounded-md bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-bold">MISSED PUNCH</span>;
      case 'UNSCHEDULED':
        return <span className="px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 text-xs font-bold">UNSCHEDULED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-bold">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 p-6 rounded-3xl bg-gradient-to-br from-red-500 to-rose-600 text-white flex flex-col justify-between shadow-xl shadow-red-500/20">
          <div>
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl w-fit mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold mb-1">Exceptions</h2>
            <p className="text-red-100 text-sm">Attendance Anomalies</p>
          </div>
          <div className="mt-8">
            <div className="text-4xl font-black">{exceptions?.length || 0}</div>
            <div className="text-sm font-medium text-red-100 uppercase tracking-wider">Unresolved Issues</div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform">
              <Clock className="h-24 w-24" />
            </div>
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Late Arrivals</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {exceptions?.filter(e => e.exceptionType === 'LATE').length || 0}
            </div>
          </div>
          <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform">
              <LogOut className="h-24 w-24" />
            </div>
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Missed Punches</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {exceptions?.filter(e => e.exceptionType.includes('MISSING')).length || 0}
            </div>
          </div>
          <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform">
              <CalendarX className="h-24 w-24" />
            </div>
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Unscheduled</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {exceptions?.filter(e => e.exceptionType === 'UNSCHEDULED').length || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Exceptions List */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl w-fit overflow-x-auto">
            {(['ALL', 'LATE', 'MISSING_OUT_PUNCH', 'UNSCHEDULED'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterType(status)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                  filterType === status 
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {status.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-0">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50/50 dark:bg-gray-800/20 text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-0 backdrop-blur-md z-10">
              <tr>
                <th className="p-4 border-b border-gray-100 dark:border-gray-800">Employee</th>
                <th className="p-4 border-b border-gray-100 dark:border-gray-800">Exception</th>
                <th className="p-4 border-b border-gray-100 dark:border-gray-800">Date & Time</th>
                <th className="p-4 border-b border-gray-100 dark:border-gray-800 text-right">Resolve</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredExceptions?.map(ex => (
                  <motion.tr
                    key={ex.attendanceLogId}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors group"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold border border-gray-300 dark:border-gray-600">
                          {ex.employeeName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{ex.employeeName}</div>
                          <div className="text-xs text-gray-500">{ex.employeeCode} • {ex.departmentName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        {getExceptionIcon(ex.exceptionType)}
                        {getExceptionBadge(ex.exceptionType)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{ex.description}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {format(new Date(ex.attendanceDate), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex gap-2">
                        {ex.punchIn && <span>IN: {format(new Date(ex.punchIn), 'HH:mm')}</span>}
                        {ex.punchOut && <span>OUT: {format(new Date(ex.punchOut), 'HH:mm')}</span>}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm transition-all"
                        >
                          Manual Override
                        </button>
                        <button 
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                          title="Acknowledge & Clear"
                        >
                          <CheckCircle className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              
              {filteredExceptions?.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <CheckCircle className="h-8 w-8 mx-auto mb-3 text-emerald-500 opacity-50" />
                    No attendance exceptions! All punches are reconciled.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
