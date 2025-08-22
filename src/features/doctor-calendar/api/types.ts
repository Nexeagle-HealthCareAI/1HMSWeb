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

export interface CreateOverridePayload {
  doctorId: string;
  shiftName: ShiftName;
  startTime: string; // TIME format "HH:MM:SS"
  endTime: string;   // TIME format "HH:MM:SS"
  slotDurationInMinutes: number;
  recurringDays?: string | null; // Comma-separated string "Mon,Wed,Fri" or null
  overrideDate?: string | null;  // DATE format "YYYY-MM-DD" for specific day
  startDate?: string | null;     // DATE format "YYYY-MM-DD" for recurring start
  endDate?: string | null;       // DATE format "YYYY-MM-DD" for recurring end
  maxPatients?: number | null;   // Additional field (not in table but useful)
  reason?: string | null;        // Additional field (not in table but useful)
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

// Doctor Calendar Configuration Types
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

export interface DoctorCalendarConfigResponse {
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