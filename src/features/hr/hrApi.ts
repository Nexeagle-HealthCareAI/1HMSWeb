// ─── 1HR Suite — API Hooks + Endpoint Definitions ────────────────────────────
// Follows the same React Query pattern used in the rest of easyHMSWeb.
// Mock data is used when the backend endpoint is not yet available.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { isAxiosError } from 'axios';
import { apiClient } from '@/services/axiosClient';
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

// The old fetch()-based implementation threw new Error(body.message) on failure, so components
// like PayrollWizard's runError.message expect the backend's actual message. Axios errors carry
// that in error.response.data.message instead -- this keeps the same error.message contract for
// every mutation caller without touching each consuming component.
async function unwrapMutationError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isAxiosError(err)) {
      const apiMessage = (err.response?.data as { message?: string } | undefined)?.message;
      if (apiMessage) throw new Error(apiMessage);
    }
    throw err;
  }
}

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
    queryFn: () => apiClient.get(`/api/v1/hr/kpi-summary?hospitalId=${hospitalId}`),
    staleTime: 30_000,
    enabled: !!hospitalId,
  });
}

// ─── Employees ────────────────────────────────────────────────────────────────

export function useHrEmployees(filters: EmployeeFilters = {}) {
  return useQuery<HrEmployee[]>({
    queryKey: HR_QUERY_KEYS.employees(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.hospitalId) params.append('hospitalId', filters.hospitalId);
      if (filters.search) params.append('searchQuery', filters.search);
      if (filters.employmentType) params.append('employmentType', filters.employmentType);
      if (filters.isActive !== undefined) params.append('isActive', filters.isActive.toString());
      if (filters.departmentId) params.append('departmentId', filters.departmentId);

      const data = await apiClient.get<{ employees: HrEmployee[] }>(`/api/v1/hr/employees?${params.toString()}`);
      return data.employees || [];
    },
    staleTime: 60_000,
  });
}

export function useHrEmployee(id: string) {
  return useQuery<HrEmployee | undefined>({
    queryKey: HR_QUERY_KEYS.employee(id),
    queryFn: async () => {
      // Use the generic employees endpoint and filter for now (or a specific by-id endpoint if available)
      const data = await apiClient.get<{ employees: HrEmployee[] }>('/api/v1/hr/employees');
      const all = data.employees || [];
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
      const data = await apiClient.get<{ leaveRequests: HrLeaveRequest[] }>(`/api/v1/hr/leave-requests?hospitalId=${hospitalId}`);
      return data.leaveRequests || [];
    },
    staleTime: 30_000,
  });
}

export function useLeaveBalance(employeeId: string) {
  return useQuery<HrLeaveBalance | undefined>({
    queryKey: HR_QUERY_KEYS.leaveBalance(employeeId),
    queryFn: async () => {
      const data = await apiClient.get<{ leaveBalance: HrLeaveBalance | null }>(`/api/v1/hr/leave-balances?employeeId=${employeeId}`);
      return data.leaveBalance || undefined;
    },
    enabled: !!employeeId,
  });
}

export function useDecideLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leaveId, status, reason }: { leaveId: string; status: LeaveStatus; reason?: string }) =>
      unwrapMutationError(() => apiClient.put(`/api/v1/hr/leave-requests/${leaveId}/status`, { status, reason })),
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
      const data = await apiClient.get<{ payrollRuns: HrPayrollRun[] }>(`/api/v1/hr/payroll/run?hospitalId=${hospitalId}&month=${month}&year=${year}`);
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
      const data = await apiClient.get<{ attendanceLogs: HrAttendanceLog[] }>(`/api/v1/hr/attendance-today?hospitalId=${hospitalId}&date=${dateStr}`);
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
      const data = await apiClient.get<{ exceptions: AttendanceExceptionDto[] }>(`/api/v1/hr/attendance/exceptions?hospitalId=${hospitalId}&startDate=${startDate}&endDate=${endDate}`);
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
      const data = await apiClient.get<{ shifts: HrHospitalShift[] }>(`/api/v1/hr/shifts?hospitalId=${hospitalId}`);
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
      const start = format(startDate, 'yyyy-MM-dd');
      const end = format(endDate, 'yyyy-MM-dd');
      const data = await apiClient.get<{ rosters: HrDutyRoster[] }>(`/api/v1/hr/rosters?hospitalId=${hospitalId}&startDate=${start}&endDate=${end}`);
      return data.rosters || [];
    },
    staleTime: 60_000,
  });
}

// ─── Create / Update Employee ─────────────────────────────────────────────────

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateHrEmployeeRequest) => unwrapMutationError(() => apiClient.post('/api/v1/hr/employees', data)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr', 'employees'] });
      qc.invalidateQueries({ queryKey: ['hr', 'kpi'] });
    },
  });
}

// ─── Module 4: Payroll ────────────────────────────────────────────────────────

export function useRunPayroll() {
  return useMutation<RunMonthlyPayrollResponseModel, Error, { hospitalId: string, month: number, year: number }>({
    mutationFn: ({ hospitalId, month, year }) =>
      unwrapMutationError(() => apiClient.post(`/api/v1/hr/payroll/run?hospitalId=${hospitalId}&month=${month}&year=${year}`)),
  });
}

export const downloadBankExport = (hrPayrollRunId: string, format: string) =>
  unwrapMutationError(() => apiClient.download(
    `/api/v1/hr/payroll/export-bank?hrPayrollRunId=${hrPayrollRunId}&format=${format}`,
    `Payroll_${format}_${new Date().getTime()}.csv`
  ));

export function useGetPayslipsByRun(hrPayrollRunId: string | null) {
  return useQuery<GetPayslipsByRunResponseModel, Error>({
    queryKey: ['hr', 'payroll', hrPayrollRunId, 'payslips'],
    queryFn: () => apiClient.get(`/api/v1/hr/payroll/${hrPayrollRunId}/payslips`),
    enabled: !!hrPayrollRunId
  });
}

export function useDispatchPayslips() {
  return useMutation<DispatchPayslipsResponseModel, Error, string>({
    mutationFn: (hrPayrollRunId: string) => unwrapMutationError(() => apiClient.post(`/api/v1/hr/payroll/${hrPayrollRunId}/dispatch`)),
  });
}
