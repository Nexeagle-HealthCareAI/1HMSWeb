import { 
  Doctor, 
  ShiftTemplate, 
  ShiftOverride, 
  Block, 
  AppointmentEvent,
  CalendarEvent,
  CreateOverridePayload,
  CreateBlockPayload,
  SaveTemplatesPayload,
  ShiftName 
} from './types';
import { 
  format, 
  addDays, 
  parseISO, 
  setHours, 
  setMinutes,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval
} from 'date-fns';

// Seed data
const doctors: Doctor[] = [
  { doctorId: 'doc1', fullName: 'Dr. Sarah Johnson', primaryDepartment: 'Cardiology' },
  { doctorId: 'doc2', fullName: 'Dr. Michael Chen', primaryDepartment: 'Neurology' }
];

let shiftTemplates: ShiftTemplate[] = [
  // Dr. Sarah Johnson - Mon-Fri Morning & Afternoon
  { templateId: 't1', doctorId: 'doc1', dayOfWeek: 1, shiftName: 'Morning', startTime: '09:00', endTime: '12:00', slotMinutes: 15, isActive: true },
  { templateId: 't2', doctorId: 'doc1', dayOfWeek: 1, shiftName: 'Afternoon', startTime: '14:00', endTime: '17:00', slotMinutes: 10, isActive: true },
  { templateId: 't3', doctorId: 'doc1', dayOfWeek: 2, shiftName: 'Morning', startTime: '09:00', endTime: '12:00', slotMinutes: 15, isActive: true },
  { templateId: 't4', doctorId: 'doc1', dayOfWeek: 2, shiftName: 'Afternoon', startTime: '14:00', endTime: '17:00', slotMinutes: 10, isActive: true },
  { templateId: 't5', doctorId: 'doc1', dayOfWeek: 3, shiftName: 'Morning', startTime: '09:00', endTime: '12:00', slotMinutes: 15, isActive: true },
  { templateId: 't6', doctorId: 'doc1', dayOfWeek: 3, shiftName: 'Afternoon', startTime: '14:00', endTime: '17:00', slotMinutes: 10, isActive: true },
  { templateId: 't7', doctorId: 'doc1', dayOfWeek: 4, shiftName: 'Morning', startTime: '09:00', endTime: '12:00', slotMinutes: 15, isActive: true },
  { templateId: 't8', doctorId: 'doc1', dayOfWeek: 4, shiftName: 'Afternoon', startTime: '14:00', endTime: '17:00', slotMinutes: 10, isActive: true },
  { templateId: 't9', doctorId: 'doc1', dayOfWeek: 5, shiftName: 'Morning', startTime: '09:00', endTime: '12:00', slotMinutes: 15, isActive: true },
  { templateId: 't10', doctorId: 'doc1', dayOfWeek: 5, shiftName: 'Afternoon', startTime: '14:00', endTime: '17:00', slotMinutes: 10, isActive: true },
  { templateId: 't11', doctorId: 'doc1', dayOfWeek: 6, shiftName: 'Morning', startTime: '09:00', endTime: '12:00', slotMinutes: 15, isActive: false },
  
  // Dr. Michael Chen - Mon-Fri Morning only
  { templateId: 't12', doctorId: 'doc2', dayOfWeek: 1, shiftName: 'Morning', startTime: '08:00', endTime: '12:00', slotMinutes: 20, isActive: true },
  { templateId: 't13', doctorId: 'doc2', dayOfWeek: 2, shiftName: 'Morning', startTime: '08:00', endTime: '12:00', slotMinutes: 20, isActive: true },
  { templateId: 't14', doctorId: 'doc2', dayOfWeek: 3, shiftName: 'Morning', startTime: '08:00', endTime: '12:00', slotMinutes: 20, isActive: true },
  { templateId: 't15', doctorId: 'doc2', dayOfWeek: 4, shiftName: 'Morning', startTime: '08:00', endTime: '12:00', slotMinutes: 20, isActive: true },
  { templateId: 't16', doctorId: 'doc2', dayOfWeek: 5, shiftName: 'Morning', startTime: '08:00', endTime: '12:00', slotMinutes: 20, isActive: true }
];

let shiftOverrides: ShiftOverride[] = [
  {
    overrideId: 'o1',
    doctorId: 'doc1',
    shiftDate: format(new Date(), 'yyyy-MM-dd'),
    shiftName: 'Morning',
    startTime: '10:00',
    endTime: '11:30',
    slotMinutes: 30,
    reason: 'Emergency meeting'
  }
];

let blocks: Block[] = [
  {
    blockId: 'b1',
    doctorId: 'doc1',
    title: 'Annual Leave',
    blockType: 'Leave',
    startDateTime: format(addDays(new Date(), 1), "yyyy-MM-dd'T'10:00:00"),
    endDateTime: format(addDays(new Date(), 1), "yyyy-MM-dd'T'16:00:00")
  }
];

let appointments: AppointmentEvent[] = [
  {
    appointmentId: 'apt1',
    doctorId: 'doc1',
    start: format(new Date(), "yyyy-MM-dd'T'09:15:00"),
    end: format(new Date(), "yyyy-MM-dd'T'09:30:00"),
    patientName: 'John Doe',
    tokenNumber: 1
  },
  {
    appointmentId: 'apt2',
    doctorId: 'doc1',
    start: format(new Date(), "yyyy-MM-dd'T'09:45:00"),
    end: format(new Date(), "yyyy-MM-dd'T'10:00:00"),
    patientName: 'Jane Smith',
    tokenNumber: 2
  },
  {
    appointmentId: 'apt3',
    doctorId: 'doc1',
    start: format(new Date(), "yyyy-MM-dd'T'14:10:00"),
    end: format(new Date(), "yyyy-MM-dd'T'14:20:00"),
    patientName: 'Bob Wilson',
    tokenNumber: 3
  }
];

// Helper function to create shift events from templates and overrides
function createShiftEvents(
  doctorId: string, 
  fromISO: string, 
  toISO: string
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const startDate = parseISO(fromISO);
  const endDate = parseISO(toISO);
  
  // Get templates for this doctor
  const doctorTemplates = shiftTemplates.filter(t => t.doctorId === doctorId && t.isActive);
  
  // Generate events for each day in range
  let currentDate = startDate;
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    
    // Get templates for this day
    const dayTemplates = doctorTemplates.filter(t => t.dayOfWeek === dayOfWeek);
    
    // Check for overrides
    const dayOverrides = shiftOverrides.filter(o => 
      o.doctorId === doctorId && o.shiftDate === dateStr
    );
    
    dayTemplates.forEach(template => {
      // Check if there's an override for this shift
      const override = dayOverrides.find(o => o.shiftName === template.shiftName);
      const config = override || template;
      
      // Create event
      const [startHour, startMinute] = config.startTime.split(':').map(Number);
      const [endHour, endMinute] = config.endTime.split(':').map(Number);
      
      const eventStart = setMinutes(setHours(currentDate, startHour), startMinute);
      const eventEnd = setMinutes(setHours(currentDate, endHour), endMinute);
      
      events.push({
        id: `shift-${doctorId}-${dateStr}-${config.shiftName}`,
        type: 'shift',
        title: `${config.shiftName} • ${config.slotMinutes}m`,
        start: eventStart.toISOString(),
        end: eventEnd.toISOString(),
        background: true,
        extendedProps: {
          shiftName: config.shiftName,
          slotMinutes: config.slotMinutes,
          isOverride: !!override,
          overrideId: override?.overrideId,
          templateId: template.templateId
        }
      });
    });
    
    currentDate = addDays(currentDate, 1);
  }
  
  return events;
}

// Helper function to create block events
function createBlockEvents(
  doctorId: string, 
  fromISO: string, 
  toISO: string
): CalendarEvent[] {
  return blocks
    .filter(block => block.doctorId === doctorId)
    .filter(block => {
      const blockStart = parseISO(block.startDateTime);
      const blockEnd = parseISO(block.endDateTime);
      const rangeStart = parseISO(fromISO);
      const rangeEnd = parseISO(toISO);
      
      return blockStart <= rangeEnd && blockEnd >= rangeStart;
    })
    .map(block => ({
      id: `block-${block.blockId}`,
      type: 'block',
      title: `${block.blockType}: ${block.title}`,
      start: block.startDateTime,
      end: block.endDateTime,
      background: false,
      extendedProps: {
        blockType: block.blockType,
        blockId: block.blockId
      }
    }));
}

// Helper function to create appointment events
function createAppointmentEvents(
  doctorId: string, 
  fromISO: string, 
  toISO: string
): CalendarEvent[] {
  return appointments
    .filter(apt => apt.doctorId === doctorId)
    .filter(apt => {
      const aptStart = parseISO(apt.start);
      const aptEnd = parseISO(apt.end);
      const rangeStart = parseISO(fromISO);
      const rangeEnd = parseISO(toISO);
      
      return aptStart <= rangeEnd && aptEnd >= rangeStart;
    })
    .map(apt => ({
      id: `appointment-${apt.appointmentId}`,
      type: 'appointment',
      title: `${apt.tokenNumber} • ${apt.patientName}`,
      start: apt.start,
      end: apt.end,
      background: false,
      extendedProps: {
        appointmentId: apt.appointmentId,
        patientName: apt.patientName,
        tokenNumber: apt.tokenNumber
      }
    }));
}

// Mock API functions
export async function listDoctors(): Promise<Doctor[]> {
  await new Promise(resolve => setTimeout(resolve, 300));
  return doctors;
}

export async function getTemplates(doctorId: string): Promise<ShiftTemplate[]> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return shiftTemplates.filter(t => t.doctorId === doctorId);
}

export async function getOverrides(doctorId: string, fromISO: string, toISO: string): Promise<ShiftOverride[]> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return shiftOverrides.filter(o => 
    o.doctorId === doctorId && 
    o.shiftDate >= fromISO.split('T')[0] && 
    o.shiftDate <= toISO.split('T')[0]
  );
}

export async function getBlocks(doctorId: string, fromISO: string, toISO: string): Promise<Block[]> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return blocks.filter(b => b.doctorId === doctorId);
}

export async function getAppointments(doctorId: string, fromISO: string, toISO: string): Promise<AppointmentEvent[]> {
  await new Promise(resolve => setTimeout(resolve, 200));
  return appointments.filter(a => a.doctorId === doctorId);
}

export async function getCalendarEvents(doctorId: string, fromISO: string, toISO: string): Promise<CalendarEvent[]> {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const shiftEvents = createShiftEvents(doctorId, fromISO, toISO);
  const blockEvents = createBlockEvents(doctorId, fromISO, toISO);
  const appointmentEvents = createAppointmentEvents(doctorId, fromISO, toISO);
  
  return [...shiftEvents, ...blockEvents, ...appointmentEvents];
}

export async function saveTemplates(payload: SaveTemplatesPayload): Promise<ShiftTemplate[]> {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // Remove existing templates for this doctor
  shiftTemplates = shiftTemplates.filter(t => t.doctorId !== payload.doctorId);
  
  // Add new templates
  shiftTemplates.push(...payload.templates);
  
  return shiftTemplates.filter(t => t.doctorId === payload.doctorId);
}

export async function createOrUpdateOverride(payload: CreateOverridePayload): Promise<ShiftOverride> {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // Check if override already exists
  const existingIndex = shiftOverrides.findIndex(o => 
    o.doctorId === payload.doctorId && 
    o.shiftDate === payload.shiftDate && 
    o.shiftName === payload.shiftName
  );
  
  const newOverride: ShiftOverride = {
    overrideId: existingIndex >= 0 ? shiftOverrides[existingIndex].overrideId : `o${Date.now()}`,
    ...payload
  };
  
  if (existingIndex >= 0) {
    shiftOverrides[existingIndex] = newOverride;
  } else {
    shiftOverrides.push(newOverride);
  }
  
  return newOverride;
}

export async function createBlock(payload: CreateBlockPayload): Promise<Block> {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const newBlock: Block = {
    blockId: `b${Date.now()}`,
    ...payload
  };
  
  blocks.push(newBlock);
  return newBlock;
}

export async function deleteOverride(overrideId: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 400));
  shiftOverrides = shiftOverrides.filter(o => o.overrideId !== overrideId);
}

export async function deleteBlock(blockId: string): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 400));
  blocks = blocks.filter(b => b.blockId !== blockId);
}
