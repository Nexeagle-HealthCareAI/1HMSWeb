// ─── 1HR Suite — API Hooks + Endpoint Definitions ────────────────────────────
// Follows the same React Query pattern used in the rest of easyHMSWeb.
// Mock data is used when the backend endpoint is not yet available.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
// No mock data needed, everything is wired to the backend API
import type {
  HrEmployee,
  EmployeeFilters,
  CreateHrEmployeeRequest,
  HrLeaveRequest,
  HrLeaveBalance,
  HrPayrollRun,
  HrKpiSummary,
  HrAttendanceLog,
  HrHospitalShift,
  HrDutyRoster,
  LeaveStatus,
  AttendanceExceptionDto,
  RunMonthlyPayrollResponseModel,
  GetPayslipsByRunResponseModel,
  DispatchPayslipsResponseModel
} from './types';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const HR_QUERY_KEYS = {
  kpi: (hospitalId: string) => ['hr', 'kpi', hospitalId] as const,
  employees: (filters: EmployeeFilters) => ['hr', 'employees', filters] as const,
  employee: (id: string) => ['hr', 'employee', id] as const,
  leaveRequests: (hospitalId: string) => ['hr', 'leave-requests', hospitalId] as const,
  leaveBalance: (employeeId: string) => ['hr', 'leave-balance', employeeId] as const,
  payrollRun: (hospitalId: string, month: number, year: number) => ['hr', 'payroll-run', hospitalId, month, year] as const,
  attendance: (hospitalId: string, date: string) => ['hr', 'attendance', hospitalId, date] as const,
  shifts: (hospitalId: string) => ['hr', 'shifts', hospitalId] as const,
  roster: (hospitalId: string, startDate: Date, endDate: Date) => ['hr', 'roster', hospitalId, startDate.toISOString(), endDate.toISOString()] as const,
  attendanceExceptions: (hospitalId: string, startDate: string, endDate: string) => ['hr', 'attendance-exceptions', hospitalId, startDate, endDate] as const,
};

// ─── KPI Summary ─────────────────────────────────────────────────────────────

export function useHrKpi(hospitalId: string) {
  return useQuery<HrKpiSummary>({
    queryKey: HR_QUERY_KEYS.kpi(hospitalId),
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/hr/kpi-summary?hospitalId=${hospitalId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch KPI summary');
      }
      return data;
    },
    staleTime: 30_000,
    enabled: !!hospitalId,
  });
}

// ─── Employees ────────────────────────────────────────────────────────────────

export function useHrEmployees(filters: EmployeeFilters = {}) {
  return useQuery<HrEmployee[]>({
    queryKey: HR_QUERY_KEYS.employees(filters),
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.hospitalId) params.append('hospitalId', filters.hospitalId);
      if (filters.search) params.append('searchQuery', filters.search);
      if (filters.employmentType) params.append('employmentType', filters.employmentType);
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
      if (filters.departmentId) params.append('departmentId', filters.departmentId);

      const response = await fetch(`/api/v1/hr/employees?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch employees');
      }
      return data.employees || [];
    },
    staleTime: 60_000,
  });
}

export function useHrEmployee(id: string) {
  return useQuery<HrEmployee | undefined>({
    queryKey: HR_QUERY_KEYS.employee(id),
    queryFn: async () => {
      const token = localStorage.getItem('token');
      // Use the generic employees endpoint and filter for now (or a specific by-id endpoint if available)
      const response = await fetch(`/api/v1/hr/employees`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch employee');
      }
      const all: HrEmployee[] = data.employees || [];
      return all.find(e => e.id === id);
    },
    enabled: !!id,
  });
}

// ─── Leave Requests ───────────────────────────────────────────────────────────

export function useLeaveRequests(hospitalId: string) {
  return useQuery<HrLeaveRequest[]>({
    queryKey: HR_QUERY_KEYS.leaveRequests(hospitalId),
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/hr/leave-requests?hospitalId=${hospitalId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch leave requests');
      return data.leaveRequests || [];
    },
    staleTime: 30_000,
  });
}

export function useLeaveBalance(employeeId: string) {
  return useQuery<HrLeaveBalance | undefined>({
    queryKey: HR_QUERY_KEYS.leaveBalance(employeeId),
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/hr/leave-balances?employeeId=${employeeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch leave balance');
      return data.leaveBalance || null;
    },
    enabled: !!employeeId,
  });
}

export function useDecideLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leaveId, status, reason }: { leaveId: string; status: LeaveStatus; reason?: string }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/hr/leave-requests/${leaveId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, reason })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to update leave status');
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'leave-requests'] });
    },
  });
}

// ─── Payroll ─────────────────────────────────────────────────────────────────

export function useGetPayrollRun(hospitalId: string, month: number, year: number) {
  return useQuery<HrPayrollRun>({
    queryKey: HR_QUERY_KEYS.payrollRun(hospitalId, month, year),
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/hr/payroll/run?hospitalId=${hospitalId}&month=${month}&year=${year}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch payroll run');
      }
      return data.payrollRuns[0] || null;
    },
    enabled: !!hospitalId && !!month && !!year,
  });
}

// Duplicate payroll hooks removed - see useRunPayroll and useDispatchPayslips at the bottom

// ─── Attendance ───────────────────────────────────────────────────────────────

export function useGetAttendanceToday(hospitalId: string, date: Date = new Date()) {
  const dateStr = format(date, 'yyyy-MM-dd');
  return useQuery<HrAttendanceLog[]>({
    queryKey: HR_QUERY_KEYS.attendance(hospitalId, dateStr),
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/hr/attendance-today?hospitalId=${hospitalId}&date=${dateStr}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch attendance');
      return data.attendanceLogs || [];
    },
    staleTime: 60_000,
    enabled: !!hospitalId,
  });
}

export function useAttendanceExceptions(hospitalId: string, startDate: string, endDate: string) {
  return useQuery<AttendanceExceptionDto[]>({
    queryKey: HR_QUERY_KEYS.attendanceExceptions(hospitalId, startDate, endDate),
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/hr/attendance/exceptions?hospitalId=${hospitalId}&startDate=${startDate}&endDate=${endDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch attendance exceptions');
      return data.exceptions || [];
    },
    staleTime: 30_000,
  });
}

// ─── Shifts ───────────────────────────────────────────────────────────────────

export function useHospitalShifts(hospitalId: string) {
  return useQuery<HrHospitalShift[]>({
    queryKey: HR_QUERY_KEYS.shifts(hospitalId),
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/hr/shifts?hospitalId=${hospitalId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch shifts');
      return data.shifts || [];
    },
    staleTime: 300_000,
  });
}

// ─── Roster ───────────────────────────────────────────────────────────────────

export function useDutyRoster(hospitalId: string, startDate: Date, endDate: Date) {
  return useQuery<HrDutyRoster[]>({
    queryKey: HR_QUERY_KEYS.roster(hospitalId, startDate, endDate),
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const start = format(startDate, 'yyyy-MM-dd');
      const end = format(endDate, 'yyyy-MM-dd');
      const response = await fetch(`/api/v1/hr/rosters?hospitalId=${hospitalId}&startDate=${start}&endDate=${end}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch roster');
      return data.rosters || [];
    },
    staleTime: 60_000,
  });
}

// ─── Create / Update Employee (stub) ─────────────────────────────────────────

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateHrEmployeeRequest) => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/hr/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Failed to create employee');
      }
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'employees'] });
      qc.invalidateQueries({ queryKey: ['hr', 'kpi'] });
    },
  });
}

// ─── Module 4: Payroll ────────────────────────────────────────────────────────

export function useRunPayroll() {
  return useMutation<RunMonthlyPayrollResponseModel, Error, { hospitalId: string, month: number, year: number }>({
    mutationFn: async ({ hospitalId, month, year }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/hr/payroll/run?hospitalId=${hospitalId}&month=${month}&year=${year}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to run payroll');
      }
      return data;
    }
  });
}

export const downloadBankExport = async (hrPayrollRunId: string, format: string) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`/api/v1/hr/payroll/export-bank?hrPayrollRunId=${hrPayrollRunId}&format=${format}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to download bank export');
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Payroll_${format}_${new Date().getTime()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

export function useGetPayslipsByRun(hrPayrollRunId: string | null) {
  return useQuery<GetPayslipsByRunResponseModel, Error>({
    queryKey: ['hr', 'payroll', hrPayrollRunId, 'payslips'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/hr/payroll/${hrPayrollRunId}/payslips`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch payslips');
      }
      return data;
    },
    enabled: !!hrPayrollRunId
  });
}

export function useDispatchPayslips() {
  return useMutation<DispatchPayslipsResponseModel, Error, string>({
    mutationFn: async (hrPayrollRunId: string) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/v1/hr/payroll/${hrPayrollRunId}/dispatch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to dispatch payslips');
      }
      return data;
    }
  });
}
