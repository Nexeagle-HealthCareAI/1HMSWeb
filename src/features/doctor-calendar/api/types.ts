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
  extendedProps?: Record<string, any>;
}

export interface CreateOverridePayload {
  doctorId: string;
  shiftDate: string;
  shiftName: ShiftName;
  startTime: string;
  endTime: string;
  slotMinutes: number;
  maxPatients?: number | null;
  reason?: string | null;
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
