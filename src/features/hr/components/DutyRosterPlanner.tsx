import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  User,
  AlertTriangle,
  Clock,
  MapPin,
  Plus
} from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { useHrEmployees, useHospitalShifts, useDutyRoster, useLeaveRequests } from '../hrApi';
import { ShiftBadge } from './ShiftBadge';
import type { HrDutyRoster, HrHospitalShift, HrEmployee } from '../types';

export const DutyRosterPlanner: React.FC<{ hospitalId: string }> = ({ hospitalId }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

  const { data: employees } = useHrEmployees({ isActive: true });
  const { data: shifts } = useHospitalShifts(hospitalId);
  const endDate = addDays(startDate, 6);
  const { data: roster } = useDutyRoster(hospitalId, startDate, endDate);
  const { data: leaves } = useLeaveRequests(hospitalId);

  // Group employees by department for the view
  const departments = Array.from(new Set(employees?.map(e => e.departmentName) || []));

  const getRosterForCell = (empId: string, date: Date) => {
    return roster?.find(r => r.employeeId === empId && r.rosterDate === format(date, 'yyyy-MM-dd'));
  };

  const getLeaveForCell = (empId: string, date: Date) => {
    return leaves?.find(
      l =>
        l.employeeId === empId &&
        l.status === 'APPROVED' &&
        new Date(l.startDate) <= date &&
        new Date(l.endDate) >= date
    );
  };

  return (
    <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-md rounded-3xl border border-gray-200/50 dark:border-gray-800/50 shadow-xl overflow-hidden flex flex-col h-[700px]">
      
      {/* Header Controls */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white/50 dark:bg-gray-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Duty Roster</h2>
            <p className="text-xs text-gray-500">Weekly Shift Planner</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
            <button
              onClick={() => setCurrentDate(addDays(currentDate, -7))}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="px-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
              {format(startDate, 'MMM d')} - {format(addDays(startDate, 6), 'MMM d, yyyy')}
            </div>
            <button
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
              className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all flex items-center gap-2">
            <span>Publish Roster</span>
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-20 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm">
            <tr>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-800 font-semibold text-sm text-gray-600 dark:text-gray-400 min-w-[200px] sticky left-0 z-30 bg-gray-50/95 dark:bg-gray-900/95">
                Staff Member
              </th>
              {weekDays.map(day => (
                <th key={day.toISOString()} className="p-3 border-b border-gray-200 dark:border-gray-800 min-w-[140px] text-center">
                  <div className="text-xs text-gray-500 uppercase tracking-wider">{format(day, 'EEE')}</div>
                  <div className={`text-sm font-bold ${isSameDay(day, new Date()) ? 'text-brand-600 dark:text-brand-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {format(day, 'MMM d')}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {departments.map(dept => {
              const deptEmployees = employees?.filter(e => e.departmentName === dept) || [];
              if (deptEmployees.length === 0) return null;
              return (
                <React.Fragment key={dept}>
                  {/* Department Row */}
                  <tr>
                    <td colSpan={8} className="bg-gray-100/50 dark:bg-gray-800/30 px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800 sticky left-0">
                      {dept}
                    </td>
                  </tr>
                  {/* Employee Rows */}
                  {deptEmployees.map(emp => (
                    <tr key={emp.id} className="group border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50/50 dark:hover:bg-gray-800/20">
                      <td className="p-3 border-r border-gray-100 dark:border-gray-800 sticky left-0 bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/80 z-10">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-brand-100 to-indigo-100 dark:from-brand-900/40 dark:to-indigo-900/40 flex items-center justify-center border border-brand-200 dark:border-brand-800">
                            <span className="text-xs font-bold text-brand-700 dark:text-brand-400">
                              {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {emp.firstName} {emp.lastName}
                            </div>
                            <div className="text-[10px] text-gray-500 truncate">{emp.designation}</div>
                          </div>
                        </div>
                      </td>
                      
                      {/* Days columns */}
                      {weekDays.map(day => {
                        const shiftAssignment = getRosterForCell(emp.id, day);
                        const leave = getLeaveForCell(emp.id, day);
                        const isConflict = shiftAssignment && leave;

                        return (
                          <td key={day.toISOString()} className="p-2 border-r border-gray-100 dark:border-gray-800/50 text-center relative hover:bg-gray-100/50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
                            {leave && !shiftAssignment && (
                              <div className="h-full w-full rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 flex flex-col items-center justify-center py-2 px-1 text-orange-600 dark:text-orange-400">
                                <span className="text-xs font-bold">{leave.leaveType} LEAVE</span>
                              </div>
                            )}

                            {isConflict && (
                              <div className="absolute inset-1 rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-500/50 z-10 flex flex-col items-center justify-center p-1">
                                <AlertTriangle className="h-4 w-4 text-red-600 mb-1" />
                                <span className="text-[9px] font-bold text-red-600 leading-tight">CLASH</span>
                              </div>
                            )}

                            {shiftAssignment && !isConflict && (
                              <div className={`h-full w-full rounded-lg p-2 flex flex-col gap-1 items-start justify-center border transition-all ${shiftAssignment.restPeriodViolation ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm'}`}>
                                <ShiftBadge shiftCode={shiftAssignment.shiftCode} />
                                {shiftAssignment.wardName && (
                                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate max-w-[80px]">{shiftAssignment.wardName}</span>
                                  </div>
                                )}
                                {shiftAssignment.restPeriodViolation && (
                                  <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded w-full">
                                    <AlertTriangle className="h-3 w-3 shrink-0" />
                                    <span className="truncate">Rest Violation</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {!shiftAssignment && !leave && (
                              <div className="opacity-0 group-hover:opacity-100 h-full w-full flex items-center justify-center transition-opacity">
                                <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/30">
                                  <Plus className="h-4 w-4" />
                                </div>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
