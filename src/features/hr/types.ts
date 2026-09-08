// ─── 1HR Suite — Type Definitions ──────────────────────────────────────────
// Following the same pattern as billing/types.ts in this codebase.

// ─── Enums ─────────────────────────────────────────────────────────────────

export type EmploymentType =
  | 'FULL_TIME_SALARIED'
  | 'VISITING_CONSULTANT'
  | 'CONTRACTUAL'
  | 'INTERN';

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'SUSPENDED';

export type ShiftCode = 'SFT_M' | 'SFT_E' | 'SFT_N' | 'SFT_G' | 'SFT_CALL';

export type RosterStatus = 'SCHEDULED' | 'COMPLETED' | 'SWAPPED' | 'ABSENT';

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'ON_LEAVE';

export type PunchSource = 'BIOMETRIC' | 'GEO_MOBILE' | 'MANUAL_OVERRIDE';

export type LeaveType = 'CASUAL' | 'SICK' | 'EARNED' | 'MATERNITY' | 'COMP_OFF' | 'CME';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type PayrollRunStatus = 'DRAFT' | 'APPROVED' | 'DISBURSED';

export type PayrollTrack = 'TRACK_A_SALARIED' | 'TRACK_B_CONSULTANT';

export type LicenseAlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

// ─── Module 1: Employee Vault ───────────────────────────────────────────────

export interface HrEmployee {
  id: string;
  hospitalId: string;
  employeeCode: string; // EMP-2026-0042
  firstName: string;
  lastName: string;
  gender: 'Male' | 'Female' | 'Other';
  dob: string; // ISO date
  bloodGroup?: string;
  contactNumber: string;
  email?: string;
  photoUrl?: string;
  employmentType: EmploymentType;
  departmentId: string;
  departmentName: string;
  designation: string;
  reportingManagerId?: string;
  reportingManagerName?: string;
  dateOfJoining: string;
  probationEndDate?: string;
  panNumber: string;
  aadhaarLast4?: string;
  uanNumber?: string;
  esiNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  isActive: boolean;
  status: EmployeeStatus;
  payrollTrack: PayrollTrack;
  createdAt: string;
  // Derived / aggregated
  credentials?: HrEmployeeCredential[];
  vaccinationRecords?: HrVaccinationRecord[];
  salaryStructure?: HrSalaryStructure;
  consultantFeeConfig?: HrConsultantFeeConfig;
}

export interface HrEmployeeCredential {
  id: string;
  employeeId: string;
  councilName: string; // 'NMC', 'Bihar Medical Council', 'State Nursing Council'
  registrationNumber: string;
  qualificationDegree: string; // 'MBBS', 'MD', 'MS', 'DMLT', 'B.Sc Nursing'
  degreeCompletionYear: number;
  licenseValidUntil: string; // ISO date
  documentScanUrl?: string;
  isVerified: boolean;
  verifiedBy?: string;
  // BLS/ACLS/PALS certifications
  blsExpiryDate?: string;
  aclsExpiryDate?: string;
  palsExpiryDate?: string;
}

export interface HrVaccinationRecord {
  id: string;
  employeeId: string;
  vaccineName: string; // 'Hepatitis B', 'Tetanus Toxoid', 'Typhoid', 'Influenza'
  doseNumber: number;
  administeredOn: string; // ISO date
  nextDueDate?: string;
  batchNumber?: string;
  administeredBy?: string;
}

export interface HrNeedleStickLog {
  id: string;
  employeeId: string;
  incidentDate: string;
  sourcePatientStatus: string; // 'HIV+', 'HBsAg+', 'HCV+', 'Unknown'
  pepStarted: boolean;
  pepStartDate?: string;
  reportedBy: string;
  notes?: string;
}

// ─── Module 2: Rostering & Attendance ──────────────────────────────────────

export interface HrHospitalShift {
  id: string;
  hospitalId: string;
  shiftCode: ShiftCode;
  shiftName: string;
  startTime: string; // 'HH:mm'
  endTime: string;   // 'HH:mm'
  gracePeriodMinutes: number;
  handoverBufferMinutes: number;
  nightAllowanceAmount: number;
  isActive: boolean;
  applicableRoles: string[];
  color: string; // UI color token
}

export interface HrDutyRoster {
  id: string;
  hospitalId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  shiftId: string;
  shiftCode: ShiftCode;
  shiftName: string;
  rosterDate: string; // ISO date
  isOnCall: boolean;
  wardId?: string;
  wardName?: string;
  status: RosterStatus;
  // Violation flags
  restPeriodViolation?: boolean;
  violationMessage?: string;
}

export interface HrAttendanceLog {
  id: string;
  employeeId: string;
  employeeName: string;
  attendanceDate: string;
  punchIn?: string; // ISO datetime
  punchOut?: string;
  totalHoursWorked?: number;
  overtimeHours: number;
  punchSource: PunchSource;
  status: AttendanceStatus;
  biometricDeviceId?: string;
  geoLocation?: string;
  notes?: string;
}

export interface AttendanceExceptionDto {
  attendanceLogId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  attendanceDate: string;
  punchIn?: string;
  punchOut?: string;
  exceptionType: 'LATE' | 'MISSING_OUT_PUNCH' | 'MISSING_IN_PUNCH' | 'UNSCHEDULED';
  description: string;
}

// ─── Module 3: Leave & Comp-Off ────────────────────────────────────────────

export interface HrLeaveBalance {
  id: string;
  employeeId: string;
  employeeName: string;
  year: number;
  casualLeaveBalance: number;
  sickLeaveBalance: number;
  earnedLeaveBalance: number;
  compOffBalance: number;
  maternityLeaveBalance: number;
  cmeLeaveBalance: number;
  // Computed usage
  casualLeaveUsed: number;
  sickLeaveUsed: number;
  earnedLeaveUsed: number;
}

export interface HrLeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveStatus;
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  medicalCertificateUrl?: string;
  rejectionReason?: string;
  createdAt: string;
}

// ─── Module 4: Dual-Track Payroll ──────────────────────────────────────────

export interface HrSalaryStructure {
  id: string;
  employeeId: string;
  effectiveFrom: string;
  monthlyGrossCtc: number;
  basicSalary: number;
  hra: number;
  dearnessAllowance: number;
  specialAllowance: number;
  medicalAllowance: number;
  nightShiftAllowanceRate: number; // per night shift
  isPfEligible: boolean;
  isEsiEligible: boolean;
  professionalTax: number; // monthly (state-specific slab)
  isActive: boolean;
}

export interface HrConsultantFeeConfig {
  id: string;
  employeeId: string;
  monthlyRetainer: number;
  opdSharePercent: number;    // e.g. 60 = 60%
  ipdVisitFee: number;        // per IPD round visit
  surgeryShareConfig: SurgeryShareConfig[];
  effectiveFrom: string;
  isActive: boolean;
}

export interface SurgeryShareConfig {
  packageName: string;
  consultantShare: number; // Amount per case
}

export interface HrPayrollRun {
  id: string;
  hospitalId: string;
  month: number;
  year: number;
  totalGrossDisbursement: number;
  totalNetDisbursement: number;
  totalPfDeducted: number;
  totalEsiDeducted: number;
  totalTdsDeducted: number;
  status: PayrollRunStatus;
  processedById?: string;
  processedAt?: string;
  payslips: HrPayslip[];
}

export interface HrPayslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  designation: string;
  departmentName: string;
  payrollTrack: PayrollTrack;
  payslipNumber: string; // PAY-2026-08-0042
  totalDaysInMonth: number;
  payableDays: number;
  overtimeDays: number;
  nightShiftCount: number;
  // Track A: Earnings
  basicEarned: number;
  hraEarned: number;
  allowancesEarned: number;
  overtimeAmount: number;
  incentivesAmount: number; // From OPD/IPD/Surgery share
  // Track B specific
  retainerAmount?: number;
  opdShareAmount?: number;
  ipdVisitAmount?: number;
  surgeryShareAmount?: number;
  // Gross & Deductions
  grossEarnings: number;
  pfEmployee: number;
  esiEmployee: number;
  profTax: number;
  tdsDeducted: number;
  loanInstallment: number;
  totalDeductions: number;
  netSalary: number;
  // Employer contributions
  pfEmployer: number;
  esiEmployer: number;
  // Actions
  pdfUrl?: string;
  isSentWhatsapp: boolean;
  createdAt: string;
}

// ─── Module 5: KPI Dashboard ───────────────────────────────────────────────

export interface HrLicenseAlert {
  employeeId: string;
  employeeName: string;
  credentialType: string;
  expiryDate: string;
  daysUntilExpiry: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface HrKpiSummary {
  totalStaff: number;
  activeOnDutyToday: number;
  absentToday: number;
  nursesOnNightShift: number;
  onCallDoctors: number;
  pendingLeaveApprovals: number;
  currentMonthPayrollTotal: number;
  payrollStatus: 'DRAFT' | 'APPROVED' | 'DISBURSED';
  licenseExpiringSoon: HrLicenseAlert[];
}

// ─── Biometric / ZKTeco Webhook ─────────────────────────────────────────────

export interface BiometricPunchWebhookPayload {
  deviceId: string;
  deviceType: 'ZKTECO' | 'MATRIX' | 'ESSL';
  employeeCode: string; // Must match HrEmployee.employeeCode
  punchTime: string; // ISO datetime
  punchType: 'IN' | 'OUT';
  geoLat?: number;
  geoLng?: number;
  verificationMode: 'FINGERPRINT' | 'FACE' | 'CARD' | 'PIN';
}

// ─── Create Employee Request ────────────────────────────────────────────────
// Mirrors CreateHrEmployeeRequestModel.cs -- only these fields are currently
// persisted by the backend. hospitalId is required; userId is stamped
// server-side from the caller's own identity, never sent by the client.

export interface CreateHrEmployeeRequest {
  hospitalId: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string; // 'yyyy-MM-dd'
  contactNumber: string;
  email?: string;
  employmentType: EmploymentType;
  departmentId: string;
  designation: string;
  dateOfJoining: string; // 'yyyy-MM-dd'
  panNumber: string;
  payrollTrack: PayrollTrack;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
}

// ─── Filter/Pagination Helpers ─────────────────────────────────────────────

export interface EmployeeFilters {
  hospitalId?: string;
  search?: string;
  departmentId?: string;
  employmentType?: EmploymentType;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface RosterFilters {
  departmentId?: string;
  from: string;
  to: string;
  wardId?: string;
}

export interface LeaveFilters {
  status?: LeaveStatus;
  leaveType?: LeaveType;
  from?: string;
  to?: string;
  employeeId?: string;
}

// ─── Module 4: Payroll Batch ────────────────────────────────────────────────

export interface RunMonthlyPayrollResponseModel {
  success: boolean;
  message: string;
  hrPayrollRunId?: string;
  payslipsGenerated?: number;
  totalNetDisbursement?: number;
  errors?: string[];
}

export interface HrPayslipDto {
  hrPayslipId: string;
  payslipNumber: string;
  employeeName: string;
  employeeCode: string;
  departmentName: string;
  designation: string;
  payrollTrack: string;
  panNumber: string;
  uanNumber?: string;
  bankName?: string;
  bankAccountNumber?: string;
  
  totalDaysInMonth: number;
  payableDays: number;
  overtimeDays: number;
  nightShiftCount: number;
  
  basicEarned: number;
  hraEarned: number;
  allowancesEarned: number;
  overtimeAmount: number;
  nightAllowanceAmount: number;
  incentivesAmount: number;
  retainerAmount: number;
  opdShareAmount: number;
  ipdVisitAmount: number;
  surgeryShareAmount: number;
  grossEarnings: number;
  
  pfEmployee: number;
  esiEmployee: number;
  profTax: number;
  tdsDeducted: number;
  loanInstallment: number;
  totalDeductions: number;
  
  netSalary: number;
}

export interface GetPayslipsByRunResponseModel {
  payslips: HrPayslipDto[];
}

export interface DispatchPayslipsResponseModel {
  success: boolean;
  message: string;
  dispatchedCount: number;
}


