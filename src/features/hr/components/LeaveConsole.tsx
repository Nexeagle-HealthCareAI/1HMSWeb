import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UmbrellaOff,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Search,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { useLeaveRequests, useLeaveBalance, useDecideLeave, useHrEmployees } from '../hrApi';
import type { HrLeaveRequest, LeaveStatus } from '../types';

export const LeaveConsole: React.FC<{ hospitalId: string }> = ({ hospitalId }) => {
  const { data: leaves, isLoading } = useLeaveRequests(hospitalId);
  const { data: employees } = useHrEmployees();
  const decideLeave = useDecideLeave();

  const [filterStatus, setFilterStatus] = useState<LeaveStatus | 'ALL'>('PENDING');
  const [search, setSearch] = useState('');

  const filteredLeaves = leaves?.filter(l => {
    if (filterStatus !== 'ALL' && l.status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.employeeName.toLowerCase().includes(q) || l.employeeCode.toLowerCase().includes(q);
    }
    return true;
  });

  const handleDecide = (leaveId: string, status: LeaveStatus) => {
    decideLeave.mutate({ leaveId, status });
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1 p-6 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex flex-col justify-between shadow-xl shadow-orange-500/20">
          <div>
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl w-fit mb-4">
              <UmbrellaOff className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold mb-1">Leave Console</h2>
            <p className="text-amber-100 text-sm">Manage time-off quotas</p>
          </div>
          <div className="mt-8">
            <div className="text-4xl font-black">{leaves?.filter(l => l.status === 'PENDING').length || 0}</div>
            <div className="text-sm font-medium text-amber-100 uppercase tracking-wider">Pending Approvals</div>
          </div>
        </div>

        {/* Quota Summary Widget (Mocked for global view) */}
        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center">
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span> Casual Leave (CL)
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">14.5 <span className="text-sm font-normal text-gray-500">avg balance</span></div>
            <div className="mt-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-500 h-full w-[65%] rounded-full"></div>
            </div>
          </div>
          <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center">
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Sick Leave (SL)
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">8.0 <span className="text-sm font-normal text-gray-500">avg balance</span></div>
            <div className="mt-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-full w-[80%] rounded-full"></div>
            </div>
          </div>
          <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-center">
            <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span> Comp-Off Pool
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">42 <span className="text-sm font-normal text-gray-500">unclaimed days</span></div>
            <div className="mt-4 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-purple-500 h-full w-[30%] rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl w-fit">
            {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  filterStatus === status 
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {status}
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
            <thead className="bg-gray-50/50 dark:bg-gray-800/20 text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-0 backdrop-blur-md">
              <tr>
                <th className="p-4 border-b border-gray-100 dark:border-gray-800">Employee</th>
                <th className="p-4 border-b border-gray-100 dark:border-gray-800">Leave Details</th>
                <th className="p-4 border-b border-gray-100 dark:border-gray-800">Duration</th>
                <th className="p-4 border-b border-gray-100 dark:border-gray-800 text-center">Status</th>
                <th className="p-4 border-b border-gray-100 dark:border-gray-800 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filteredLeaves?.map(req => (
                  <motion.tr
                    key={req.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-100 to-amber-100 flex items-center justify-center text-brand-700 font-bold border border-brand-200/50">
                          {req.employeeName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">{req.employeeName}</div>
                          <div className="text-xs text-gray-500">{req.employeeCode} • {req.departmentName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 mb-1">
                        {req.leaveType}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1">{req.reason}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {format(new Date(req.startDate), 'MMM d, yyyy')} - {format(new Date(req.endDate), 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-brand-600 dark:text-brand-400 font-bold mt-0.5">
                        {req.totalDays} Day(s)
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      {req.status === 'PENDING' && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 text-xs font-bold">
                          <Clock className="h-3.5 w-3.5" /> Pending
                        </div>
                      )}
                      {req.status === 'APPROVED' && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-xs font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                        </div>
                      )}
                      {req.status === 'REJECTED' && (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 text-xs font-bold">
                          <XCircle className="h-3.5 w-3.5" /> Rejected
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {req.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleDecide(req.id, 'REJECTED')}
                            className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800"
                            title="Reject"
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                          <button 
                            onClick={() => handleDecide(req.id, 'APPROVED')}
                            className="p-2 rounded-xl text-white bg-emerald-500 hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20"
                            title="Approve"
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </button>
                        </div>
                      ) : (
                        <button className="p-2 text-gray-400 hover:text-brand-600 transition-colors">
                          <FileText className="h-5 w-5" />
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
              
              {filteredLeaves?.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    <UmbrellaOff className="h-8 w-8 mx-auto mb-3 opacity-20" />
                    No leave requests found for this filter.
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
