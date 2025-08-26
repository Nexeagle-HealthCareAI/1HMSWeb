export type ShiftName = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

export interface Doctor {
  doctorId: string;
  fullName: string;
  primaryDepartment?: string;
}

export interface ShiftTemplate {
  templateId: string;
  doctorId: string;
  dayOfWeek: 0|1|2|3|4|5|6;
  shiftName: ShiftName;
  startTime: string;  // '09:00'
  endTime: string;    // '12:00'
  slotMinutes: number;
  maxPatients?: number | null;
  isActive: boolean;
}

export interface ShiftOverride {
  overrideId: string;
  doctorId: string;
  shiftDate: string;  // 'YYYY-MM-DD'
  shiftName: ShiftName;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  maxPatients?: number | null;
  reason?: string | null;
}

export type BlockType = 'Annual Leave'|'Sick Leave'|'Personal'|'Conference'|'Training'|'Meeting'|'Emergency'|'Other';

export interface Block {
  blockId: string;
  doctorId: string;
  title: string;
  blockType: BlockType;
  startDateTime: string; // ISO
  endDateTime: string;   // ISO
}

export interface AppointmentEvent {
  appointmentId: string;
  doctorId: string;
  start: string;   // ISO
  end: string;     // ISO
  patientName: string;
  tokenNumber?: number;
}

export interface CalendarEvent {
  id: string;
  type: 'shift'|'block'|'appointment';
  title: string;
  start: string; 
  end: string;
  background?: boolean;
  display?: 'background' | 'list-item' | 'auto';
  backgroundColor?: string;
  borderColor?: string;
  extendedProps?: Record<string, any>;
}

// Updated CreateOverridePayload to match new API request model
export interface CreateOverridePayload {
  doctorId: string;
  overrideDate: string; // ISO date string
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  shiftDetails: ShiftDetail[];
}

export interface ShiftDetail {
  shiftName: string;
  startTime: string;
  endTime: string;
  slotDurationInMinutes: number;
  recurringDays: string[];
}

export interface CreateOverrideItem {
  doctorId: string;
  shiftName: string;
  startTime: string;
  endTime: string;
  slotDuration: number;
  overrideDate: string;
  recurringDays: string[];
  startDate: string;
  endDate: string;
}

export interface CreateBlockPayload {
  doctorId: string;
  title: string;
  blockType: BlockType;
  startDateTime: string;
  endDateTime: string;
}

export interface SaveTemplatesPayload {
  doctorId: string;
  templates: ShiftTemplate[];
}

export interface TimeOff {
  timeOffId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  isUpcoming: boolean;
  createdAt: string;
  startDate?: string; // API response field
  endDate?: string;   // API response field
}

export interface GetTimeOffResponse {
  doctorId: string;
  timeOffs: TimeOff[];
}

export interface CreateTimeOffRequest {
  doctorId: string;
  fromDate: string;
  toDate: string;
  reason: string;
}

export interface CreateTimeOffResponse {
  success: boolean;
  message: string;
  timeOffId: string;
  createdAt: string;
  errors: string[];
}

export interface DeleteTimeOffResponse {
  success: boolean;
  message: string;
  timeOffId: string;
  errors: string[];
}

export interface CreateOverrideResponse {
  success: boolean;
  message: string;
  overrideId: string;
  createdAt: string;
  errors: string[];
}

export interface DeleteOverrideResponse {
  success: boolean;
  message: string;
  overrideId: string;
  errors: string[];
}

// Updated Doctor Calendar Configuration Types to match new API response model
export interface DateInfo {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  dayOfYear: number;
  dayNumber: number;
}

export interface TimeSpan {
  ticks: number;
  days: number;
  hours: number;
  milliseconds: number;
  microseconds: number;
  nanoseconds: number;
  minutes: number;
  seconds: number;
  totalDays: number;
  totalHours: number;
  totalMilliseconds: number;
  totalMicroseconds: number;
  totalNanoseconds: number;
  totalMinutes: number;
  totalSeconds: number;
}

export interface ShiftDayDetail {
  overrideId: string;
  shiftName: string;
  startTime: TimeSpan;
  endTime: TimeSpan;
  slotDurationInMinutes: number;
  recurringDays: string;
}

export interface ShiftInfo {
  shiftDate: DateInfo;
  shiftDayDetails: ShiftDayDetail[];
}

export interface DoctorCalendarConfigResponse {
  doctorId: string;
  startDate: DateInfo;
  endDate: DateInfo;
  dataSource: string;
  shiftInfo: ShiftInfo[];
}

// Legacy types for backward compatibility
export interface DoctorCalendarConfigRange {
  startDate: string;
  endDate: string;
  weekStart: string;
  timezone: string;
}

export interface DoctorCalendarConfigShift {
  shiftName: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
  sourceType: string;
  sourceId: string;
}

export interface DoctorCalendarConfigSlotSummary {
  totalSlots: number;
  blockedSlots: number;
  bookedSlots: number | null;
}

export interface DoctorCalendarConfigDay {
  date: string;
  dow: string;
  dom: number;
  source: string;
  isLocked: boolean;
  isWorkingDay: boolean;
  effectiveShifts: DoctorCalendarConfigShift[];
  slotSummary: DoctorCalendarConfigSlotSummary;
}

export interface LegacyDoctorCalendarConfigResponse {
  doctorId: string;
  date: string;
  source: string | null;
  overrideId: string | null;
  shiftName: string | null;
  startTime: string | null;
  endTime: string | null;
  slotDuration: number | null;
  range: DoctorCalendarConfigRange;
  days: DoctorCalendarConfigDay[];
  lastEvaluatedAt: string;
}